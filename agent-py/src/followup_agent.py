# src/followup_agent.py
"""Follow-up Agent — outbound callback to caller with confirmation."""
from __future__ import annotations

import logging
import os
import textwrap

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    RunContext,
    function_tool,
    inference,
)

from leads_store import LeadsStore
from voices import INTAKE_VOICE_ID

logger = logging.getLogger("followup_agent")
load_dotenv(".env.local")

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
LEADS_PATH = os.path.join(DATA_DIR, "leads.json")

FOLLOWUP_INSTRUCTIONS = textwrap.dedent("""\
    You are calling back a car accident victim to deliver good news.
    Use the SAME warm, empathetic voice they heard during their intake call.

    You CAN:
    - Confirm the firm name and attorney assigned
    - Confirm the consultation time
    - Express empathy and wish them well

    You CANNOT:
    - Discuss fees, costs, or case value
    - Give legal advice
    - Make promises about case outcomes

    FLOW:
    1. Greet them by name warmly.
    2. Identify yourself: "This is CaseRouter following up on your earlier call."
    3. Deliver the news: firm name, attorney name, consultation time.
    4. Ask if they have any questions about the appointment.
    5. Wish them well and end the call.

    Keep it brief and warm. This is a 30-60 second call.
""")


class FollowupAgent(Agent):
    def __init__(self, *, room=None, packet_id: str, confirmation: dict) -> None:
        super().__init__(
            llm=inference.LLM(model="openai/gpt-5.2-chat-latest"),
            instructions=FOLLOWUP_INSTRUCTIONS,
        )
        self._room = room
        self._packet_id = packet_id
        self._confirmation = confirmation
        self._leads_store = LeadsStore(LEADS_PATH)

    @function_tool()
    async def get_confirmation_details(self, context: RunContext) -> str:
        """Get the confirmation details to share with the caller.

        Returns firm name, attorney, and time slot.
        """
        return (
            f"Firm: {self._confirmation.get('firm_name', 'the firm')}\n"
            f"Attorney: {self._confirmation.get('attorney', 'an attorney')}\n"
            f"Time: {self._confirmation.get('time_slot', 'to be confirmed')}"
        )

    @function_tool()
    async def update_lead_status(self, context: RunContext, status: str) -> str:
        """Mark the lead as consult_booked after confirming with the caller.

        Args:
            status: Should be 'consult_booked'.
        """
        self._leads_store.update_lead(self._packet_id, {"status": status})
        return f"Lead status updated to {status}."
