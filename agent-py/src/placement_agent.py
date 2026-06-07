# src/placement_agent.py
"""Placement Agent — outbound SIP call to matched firm."""
from __future__ import annotations

import json
import logging
import os
import textwrap
import uuid

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    function_tool,
    inference,
    room_io,
)
from livekit.plugins import minimax, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from moss import MossClient, QueryOptions

from leads_store import LeadsStore
from voices import PLACEMENT_VOICE_ID, PLACEMENT_DEFAULT_EMOTION

logger = logging.getLogger("placement_agent")
load_dotenv(".env.local")

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
LEADS_PATH = os.path.join(DATA_DIR, "leads.json")

PLACEMENT_INSTRUCTIONS = textwrap.dedent("""\
    You are a professional case placement coordinator for the CaseRouter Auto network.
    You are calling a law firm to present a case for their review.

    You CAN:
    - Share case type, injury severity, location, liability assessment
    - Discuss the case details openly — this is a firm-to-firm call
    - Ask about the firm's current capacity
    - Discuss referral terms

    You CANNOT:
    - Share the caller's phone number until the firm accepts
    - Make promises about case outcomes
    - Guarantee referral fees

    FLOW:
    1. Introduce yourself: "This is CaseRouter Auto calling with a case for your review."
    2. Present the case summary from your case data.
    3. Ask if the firm has capacity to take the case.
    4. If they accept, confirm the attorney and time slot.
    5. If they decline, thank them and end the call.

    Be concise and professional. This is a business call.
""")


class PlacementAgent(Agent):
    def __init__(self, *, room=None, packet_id: str, case_summary: str) -> None:
        super().__init__(
            llm=inference.LLM(model="openai/gpt-5.2-chat-latest"),
            instructions=PLACEMENT_INSTRUCTIONS,
        )
        self._room = room
        self._packet_id = packet_id
        self._case_summary = case_summary
        self._leads_store = LeadsStore(LEADS_PATH)

    @function_tool()
    async def get_case_summary(self, context: RunContext) -> str:
        """Get the case summary to present to the firm.

        Returns the key details of the case being placed.
        """
        return self._case_summary

    @function_tool()
    async def update_lead_status(
        self, context: RunContext, status: str, attorney: str = "", time_slot: str = ""
    ) -> str:
        """Update the lead status after the firm's response.

        Args:
            status: 'accepted', 'declined', or 'callback_needed'.
            attorney: Name of the attorney who will handle the case.
            time_slot: Scheduled consultation time.
        """
        updates = {"status": "referred" if status == "accepted" else "declined"}
        if attorney:
            updates["scheduled_attorney"] = attorney
        if time_slot:
            updates["scheduled_time"] = time_slot
        self._leads_store.update_lead(self._packet_id, updates)
        return f"Lead status updated to {status}."
