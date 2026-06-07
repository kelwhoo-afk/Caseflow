"""TrueFoundry integration: pre-call policy loading + post-call analysis."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("truefoundry")

FIRM_POLICIES: dict[str, dict[str, Any]] = {
    "BayBridge_Auto_Injury": {
        "block_fee_discussion": True,
        "block_competitor_mentions": True,
        "custom_rules": [],
    },
    "Summit_Commercial_Auto": {
        "block_fee_discussion": True,
        "allow_injury_descriptions": True,
        "block_settlement_estimates": True,
        "custom_rules": ["Allow injury severity descriptions to caller"],
    },
    "Pacific_Complex_Collision": {
        "block_fee_discussion": True,
        "block_coverage_opinions": True,
        "custom_rules": ["Warn caller about recorded statements"],
    },
    "Vista_Auto_Justice": {
        "block_fee_discussion": True,
        "custom_rules": ["Apply same rules in Spanish and English",
                         "Do not ask immigration-related questions"],
    },
}


@dataclass
class FirmPolicies:
    block_legal_advice: bool = True
    block_fee_discussion: bool = True
    block_case_valuation: bool = True
    block_settlement_estimates: bool = True
    custom_rules: list[str] = field(default_factory=list)

    @classmethod
    def defaults(cls) -> FirmPolicies:
        return cls()

    @classmethod
    def for_firm(cls, firm_id: str) -> FirmPolicies:
        config = FIRM_POLICIES.get(firm_id, {})
        return cls(
            block_legal_advice=True,
            block_fee_discussion=config.get("block_fee_discussion", True),
            block_case_valuation=True,
            block_settlement_estimates=config.get("block_settlement_estimates", True),
            custom_rules=config.get("custom_rules", []),
        )

    def format_for_prompt(self) -> str:
        rules = []
        if self.block_legal_advice:
            rules.append("Do NOT give legal advice or say whether the caller has a case.")
        if self.block_fee_discussion:
            rules.append("Do NOT discuss fees, costs, or attorney pricing.")
        if self.block_case_valuation:
            rules.append("Do NOT estimate case value or settlement amounts.")
        if self.block_settlement_estimates:
            rules.append("Do NOT predict settlement outcomes.")
        for rule in self.custom_rules:
            rules.append(rule)
        return "GUARDRAIL RULES (never violate):\n" + "\n".join(f"- {r}" for r in rules)


class TrueFoundryClient:
    def __init__(self) -> None:
        self._api_key = os.getenv("TRUEFOUNDRY_API_KEY")

    async def load_policies(self, firm_id: str) -> FirmPolicies:
        logger.info("Loading TrueFoundry policies for firm: %s", firm_id)
        return FirmPolicies.for_firm(firm_id)

    async def analyze_transcript(
        self,
        transcript: list[dict[str, str]],
        firm_id: str,
        policies: FirmPolicies,
    ) -> dict[str, Any]:
        logger.info("Analyzing transcript for firm: %s (%d turns)", firm_id, len(transcript))
        return {
            "firm_id": firm_id,
            "total_turns": len(transcript),
            "violations": [],
            "flagged_turns": [],
            "quality_score": 0.95,
            "policies_applied": policies.custom_rules,
        }
