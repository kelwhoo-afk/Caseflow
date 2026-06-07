# src/agent.py
"""CaseRouter Auto — Intake Agent.

Conducts legal intake calls for car accident victims. Uses Moss SessionIndex
for local-first RAG (~5ms queries), MiniMax TTS for emotion-adaptive voice,
and TrueFoundry policies for per-firm guardrails.
"""
from __future__ import annotations

import json
import logging
import os
import textwrap
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    inference,
    room_io,
)
from livekit.plugins import ai_coustics, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from moss import DocumentInfo, MossClient, QueryOptions

from case_packet import CasePacket
from leads_store import LeadsStore
from truefoundry_client import TrueFoundryClient, FirmPolicies

logger = logging.getLogger("agent")

load_dotenv(".env.local")

DEFAULT_FIRM_ID = "BayBridge_Auto_Injury"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
LEADS_PATH = os.path.join(DATA_DIR, "leads.json")

BASE_INSTRUCTIONS = textwrap.dedent("""\
    You are a professional legal intake specialist for {firm_name}.
    You collect accident details from callers for attorney review.
    You are NOT a lawyer. You cannot determine whether the caller has a case.

    INTAKE FLOW:
    1. Greet the caller warmly. Express empathy.
    2. Collect: full name, phone number, relationship to victim.
    3. Ask: what happened, where, when.
    4. Ask about injuries, medical treatment, minors involved.
    5. Ask about insurance contact, police report, other party.
    6. Use search_firms to look up relevant firm criteria for follow-up questions.
    7. Use save_to_session to save key facts as you learn them.
    8. Use update_case_packet for each field you collect.
    9. Use check_missing_fields to see what's still needed.
    10. If a referral to another firm seems likely, use check_referral_needed.
        If referral is recommended, ask for consent using the firm's consent script.
    11. Close the call professionally.

    TONE:
    Match your delivery to the caller — steady and reassuring when they
    describe pain or fear, warm when they confirm details, empathetic
    without being performative when they describe a severe situation.
    Never narrate or label your tone. Speak plainly.

    {guardrails}
""")


class IntakeAgent(Agent):
    """Voice agent that conducts legal intake calls."""

    def __init__(
        self,
        *,
        room=None,
        firm_id: str = DEFAULT_FIRM_ID,
        call_id: str | None = None,
        policies: FirmPolicies | None = None,
    ) -> None:
        self._firm_id = firm_id
        self._call_id = call_id or str(uuid.uuid4())
        self._policies = policies or FirmPolicies.defaults()
        self._room = room

        firm_name = firm_id.replace("_", " ")
        instructions = BASE_INSTRUCTIONS.format(
            firm_name=firm_name,
            guardrails=self._policies.format_for_prompt(),
        )

        super().__init__(
            llm=inference.LLM(model="openai/gpt-5.2-chat-latest"),
            instructions=instructions,
        )

        self._moss = MossClient(
            os.getenv("MOSS_PROJECT_ID"), os.getenv("MOSS_PROJECT_KEY")
        )
        self._firm_session = None
        self._call_session = None
        self._packet = CasePacket.create(firm_id=firm_id)
        self._leads_store = LeadsStore(LEADS_PATH)
        self._transcript: list[dict] = []

    async def on_enter(self) -> None:
        """Load Moss SessionIndexes at call start."""
        try:
            firm_index = f"firm-{self._firm_id.lower().replace('_', '-')}"
            self._firm_session = await self._moss.session(index_name=firm_index)
            logger.info("Loaded firm SessionIndex: %s (%d docs)",
                        firm_index, self._firm_session.doc_count)
        except Exception:
            logger.exception("Failed to load firm SessionIndex")

        try:
            self._call_session = await self._moss.session(
                index_name=f"call-{self._call_id}"
            )
            logger.info("Created call SessionIndex: call-%s", self._call_id)
        except Exception:
            logger.exception("Failed to create call SessionIndex")

    async def on_exit(self) -> None:
        """Push session data to cloud and run post-call pipeline."""
        if self._call_session:
            try:
                await self._call_session.push_index()
                logger.info("Pushed call session to cloud")
            except Exception:
                logger.exception("Failed to push call session")

        # Save lead.
        self._packet.update("transcript", self._transcript)
        self._leads_store.save_lead(self._packet)
        logger.info("Saved lead: %s", self._packet.packet_id)

    # -- Data packet publishing --

    async def _publish_data(self, packet_type: str, data: dict) -> None:
        if self._room is None:
            return
        try:
            payload = json.dumps({
                "type": packet_type,
                "data": {**data, "call_id": self._call_id},
            }, default=str).encode("utf-8")
            await self._room.local_participant.publish_data(
                payload=payload, reliable=True
            )
        except Exception:
            logger.exception("Failed to publish %s data packet", packet_type)

    # -- Function tools --

    @function_tool()
    async def search_firms(self, context: RunContext, query: str) -> str:
        """Search firm knowledge base for criteria, checklists, or scripts.

        Use this to find follow-up questions, acceptance criteria, referral
        triggers, or consent scripts relevant to what the caller described.

        Args:
            query: What to look up about firm criteria or intake procedures.
        """
        if self._firm_session is None:
            return "Firm knowledge not loaded."

        result = await self._firm_session.query(query, QueryOptions(top_k=3))

        docs = getattr(result, "docs", []) or []
        snippets = [(getattr(d, "text", "") or "").strip() for d in docs]
        snippets = [s for s in snippets if s]

        await self._publish_data("moss_retrieval", {
            "query": query,
            "matches": [
                {"text": s, "score": float(getattr(d, "score", 0)),
                 "metadata": getattr(d, "metadata", {})}
                for s, d in zip(snippets, docs)
            ],
            "latency_ms": getattr(result, "time_taken_ms", None),
        })

        if not snippets:
            return "No relevant firm knowledge found."
        return "\n\n".join(snippets)

    @function_tool()
    async def save_to_session(self, context: RunContext, fact: str) -> str:
        """Save a key fact from the conversation for later recall.

        Args:
            fact: A short statement of what the caller shared.
        """
        if self._call_session is None:
            return "Session not available."
        doc = DocumentInfo(
            id=f"{self._call_id}-{uuid.uuid4()}",
            text=fact,
            metadata={"call_id": self._call_id},
        )
        await self._call_session.add_docs([doc])
        return "Noted."

    @function_tool()
    async def recall_session(self, context: RunContext, query: str) -> str:
        """Recall facts saved earlier in this call.

        Args:
            query: What to recall from the conversation so far.
        """
        if self._call_session is None:
            return "Session not available."
        result = await self._call_session.query(query, QueryOptions(top_k=5))
        docs = getattr(result, "docs", []) or []
        facts = [(getattr(d, "text", "") or "").strip() for d in docs]
        facts = [f for f in facts if f]
        if not facts:
            return "No relevant facts found from this call."
        return "\n".join(facts)

    @function_tool()
    async def update_case_packet(
        self, context: RunContext, field_path: str, value: str
    ) -> str:
        """Update a field in the case packet.

        Args:
            field_path: Dot-separated path like 'caller.full_name' or 'accident.type'.
            value: The value to set.
        """
        try:
            # Convert string booleans.
            if value.lower() in ("true", "yes"):
                value = True
            elif value.lower() in ("false", "no"):
                value = False
            self._packet.update(field_path, value)
            await self._publish_data("case_update", {
                "field_path": field_path,
                "value": value,
                "status": "live_call",
            })
            return f"Updated {field_path}."
        except (KeyError, TypeError) as e:
            return f"Failed to update {field_path}: {e}"

    @function_tool()
    async def check_missing_fields(self, context: RunContext) -> str:
        """Check which required case packet fields are still missing.

        Returns a list of field paths that still need to be collected.
        """
        missing = self._packet.missing_fields()
        if not missing:
            return "All required fields have been collected."
        return "Still missing: " + ", ".join(missing)

    @function_tool()
    async def check_referral_needed(self, context: RunContext) -> str:
        """Check if this case should be referred to another firm.

        Queries the firm's referral triggers to see if the case is a
        better fit for a partner firm in the network.
        """
        if self._firm_session is None:
            return "Firm knowledge not loaded."

        # Build query from current packet.
        parts = []
        if self._packet.accident.get("type"):
            parts.append(self._packet.accident["type"])
        if self._packet.accident.get("description"):
            parts.append(self._packet.accident["description"])
        if self._packet.injuries.get("status"):
            parts.append(self._packet.injuries["status"])
        query = "referral criteria: " + " ".join(parts) if parts else "referral criteria"

        result = await self._firm_session.query(query, QueryOptions(
            top_k=2,
            filter={"field": "type", "condition": {"$eq": "case_criteria"}},
        ))

        docs = getattr(result, "docs", []) or []
        snippets = [(getattr(d, "text", "") or "").strip() for d in docs]
        if not snippets:
            return "No referral triggers found. This case appears to fit this firm."
        return "Referral guidance:\n" + "\n\n".join(snippets)


# -- Entrypoint --

server = AgentServer()


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="caserouter-intake")
async def intake_entrypoint(ctx: JobContext) -> None:
    # Parse metadata.
    firm_id = DEFAULT_FIRM_ID
    call_id = str(uuid.uuid4())
    if ctx.job.metadata:
        try:
            meta = json.loads(ctx.job.metadata)
            firm_id = meta.get("firm_id", DEFAULT_FIRM_ID)
            call_id = meta.get("call_id", call_id)
        except (json.JSONDecodeError, TypeError):
            pass

    # Load TrueFoundry policies.
    tf_client = TrueFoundryClient()
    policies = await tf_client.load_policies(firm_id)

    agent = IntakeAgent(firm_id=firm_id, call_id=call_id, policies=policies)

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        tts=inference.TTS(model="cartesia/sonic-2"),
        vad=ctx.proc.userdata["vad"],
        turn_detection=MultilingualModel(),
    )

    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=room_io.RoomInputOptions(
            noise_cancellation=ai_coustics.audio_enhancement(
                model=ai_coustics.EnhancerModel.QUAIL_VF_S
            ),
        ),
    )

    await ctx.connect()

    await session.generate_reply(
        instructions="Greet the caller warmly. Express empathy and explain you're here to help collect details for attorney review."
    )


placement_server = AgentServer()
placement_server.setup_fnc = prewarm


@placement_server.rtc_session(agent_name="caserouter-placement")
async def placement_entrypoint(ctx: JobContext) -> None:
    """Entrypoint for outbound placement calls to firms."""
    from placement_agent import PlacementAgent

    packet_id = ""
    case_summary = ""
    if ctx.job.metadata:
        try:
            meta = json.loads(ctx.job.metadata)
            packet_id = meta.get("packet_id", "")
            case_summary = meta.get("case_summary", "")
        except (json.JSONDecodeError, TypeError):
            pass

    agent = PlacementAgent(packet_id=packet_id, case_summary=case_summary)

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        tts=inference.TTS(model="cartesia/sonic-2"),
        vad=ctx.proc.userdata["vad"],
        turn_detection=MultilingualModel(),
    )

    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=room_io.RoomInputOptions(),
    )
    await ctx.connect()
    await session.generate_reply(
        instructions="Introduce yourself as CaseRouter Auto and present the case summary."
    )


followup_server = AgentServer()
followup_server.setup_fnc = prewarm


@followup_server.rtc_session(agent_name="caserouter-followup")
async def followup_entrypoint(ctx: JobContext) -> None:
    """Entrypoint for outbound follow-up calls to callers."""
    from followup_agent import FollowupAgent

    packet_id = ""
    confirmation = {}
    if ctx.job.metadata:
        try:
            meta = json.loads(ctx.job.metadata)
            packet_id = meta.get("packet_id", "")
            confirmation = meta.get("confirmation", {})
        except (json.JSONDecodeError, TypeError):
            pass

    agent = FollowupAgent(packet_id=packet_id, confirmation=confirmation)

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        tts=inference.TTS(model="cartesia/sonic-2"),  # Same voice as intake (continuity)
        vad=ctx.proc.userdata["vad"],
        turn_detection=MultilingualModel(),
    )

    await session.start(
        agent=agent,
        room=ctx.room,
        room_input_options=room_io.RoomInputOptions(),
    )
    await ctx.connect()
    await session.generate_reply(
        instructions="Greet the caller warmly by name and share the good news about their consultation."
    )


def _select_server_for_role(role: str) -> AgentServer:
    """Pick which AgentServer to run based on the worker role env var.

    Each AgentServer in livekit-agents 1.5.16 hosts exactly one rtc_session,
    so the three CaseRouter agents run in three separate worker processes.
    """
    if role == "placement":
        return placement_server
    if role == "followup":
        return followup_server
    return server  # default: intake


if __name__ == "__main__":
    import subprocess
    import sys

    role = os.getenv("CASEROUTER_WORKER_ROLE", "")
    multi_command = len(sys.argv) > 1 and sys.argv[1] in ("dev", "start")

    if role:
        # Child worker process — run only the assigned server.
        cli.run_app(_select_server_for_role(role))
    elif multi_command:
        # Parent process — spawn placement + followup children, run intake here.
        # All three workers share stdout/stderr so logs interleave in one terminal.
        children: list[subprocess.Popen] = []
        for child_role in ("placement", "followup"):
            child_env = os.environ.copy()
            child_env["CASEROUTER_WORKER_ROLE"] = child_role
            children.append(
                subprocess.Popen(
                    [sys.executable, __file__, *sys.argv[1:]],
                    env=child_env,
                )
            )
        try:
            cli.run_app(server)  # intake runs in this process; blocks until shutdown
        finally:
            # On Ctrl+C the children get SIGINT via the process group and shut down
            # on their own; terminate() + wait() is a safety net for clean exit.
            for child in children:
                if child.poll() is None:
                    child.terminate()
            for child in children:
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    child.kill()
    else:
        # console / download-files / single-agent modes — intake only.
        cli.run_app(server)
