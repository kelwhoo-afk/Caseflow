"""CasePacket: in-memory representation of the intake form.

Maps to schema.json. Provides field updates, missing field checks,
and hard rule evaluation for triage.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any


class CasePacket:
    """Mutable case packet that agents fill during intake calls."""

    def __init__(self, data: dict[str, Any]) -> None:
        self._data = data

    @classmethod
    def create(cls, firm_id: str) -> CasePacket:
        return cls({
            "packet_id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "call_duration_seconds": 0,
            "firm_id": firm_id,
            "caller": {
                "full_name": None,
                "phone": None,
                "dob": None,
                "email": None,
                "relation_to_victim": None,
                "victim_full_name": None,
                "consent_to_contact": False,
                "consent_to_record": False,
            },
            "accident": {
                "type": None,
                "victim_role": None,
                "date": None,
                "time": None,
                "location": {"description": None, "city": None, "state": None},
                "description": None,
                "other_party": {
                    "description": None,
                    "is_commercial": None,
                    "company_name": None,
                },
                "vehicles": {
                    "count": None,
                    "commercial_vehicle_involved": None,
                    "hit_and_run": None,
                    "other_driver_uninsured": None,
                },
            },
            "injuries": {
                "status": "unknown",
                "description": None,
                "passengers_injured": None,
                "passenger_details": None,
            },
            "medical": {
                "facility_name": None,
                "ambulance_used": None,
                "treatment_ongoing": None,
            },
            "legal": {
                "already_has_attorney": None,
                "police_report_filed": "unknown",
                "police_report_number": None,
                "adjuster_contacted_caller": None,
                "gave_recorded_statement": None,
            },
            "evidence": {
                "insurance_carrier": None,
                "insurance_policy_number": None,
                "insurance_card_image_url": None,
                "photo_urls": [],
                "photo_upload_link_sent": False,
            },
            "routing": {
                "subtype": None,
                "priority": "normal",
                "assigned_firm": None,
                "decline_reason": None,
                "missing_required_fields": [],
                "follow_up_tasks": [],
                "retrieved_rules": [],
            },
            "transcript_summary": None,
            "transcript": [],
            "truefoundry_audit": None,
        })

    @property
    def packet_id(self) -> str:
        return self._data["packet_id"]

    @property
    def created_at(self) -> str:
        return self._data["created_at"]

    @property
    def caller(self) -> dict:
        return self._data["caller"]

    @property
    def accident(self) -> dict:
        return self._data["accident"]

    @property
    def injuries(self) -> dict:
        return self._data["injuries"]

    @property
    def medical(self) -> dict:
        return self._data["medical"]

    @property
    def legal(self) -> dict:
        return self._data["legal"]

    @property
    def evidence(self) -> dict:
        return self._data["evidence"]

    @property
    def routing(self) -> dict:
        return self._data["routing"]

    def update(self, field_path: str, value: Any) -> None:
        """Update a nested field by dot-separated path."""
        keys = field_path.split(".")
        target = self._data
        for key in keys[:-1]:
            target = target[key]
        target[keys[-1]] = value

    def missing_fields(self) -> list[str]:
        """Return JSON paths of required fields that are still None."""
        required = [
            "caller.full_name",
            "caller.phone",
            "caller.relation_to_victim",
            "accident.type",
            "accident.date",
            "accident.description",
            "injuries.status",
        ]
        missing = []
        for path in required:
            keys = path.split(".")
            val = self._data
            for k in keys:
                val = val.get(k) if isinstance(val, dict) else None
            if val is None:
                missing.append(path)
        return missing

    def check_hard_rules(self) -> dict[str, Any]:
        """Evaluate hard triage rules from schema fields."""
        result: dict[str, Any] = {
            "auto_decline": False,
            "priority": "normal",
            "reason": None,
        }
        if self.legal.get("already_has_attorney") is True:
            result["auto_decline"] = True
            result["reason"] = "already_represented"
            return result
        if self.injuries.get("status") == "fatal":
            result["priority"] = "urgent"
            result["reason"] = "fatal_injury"
        elif self.accident.get("other_party", {}).get("is_commercial") is True:
            result["priority"] = "high"
            result["reason"] = "commercial_vehicle"
        elif self.injuries.get("status") == "hospitalized":
            result["priority"] = "high"
            result["reason"] = "hospitalization"
        return result

    def to_dict(self) -> dict[str, Any]:
        return self._data.copy()

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CasePacket:
        return cls(data)
