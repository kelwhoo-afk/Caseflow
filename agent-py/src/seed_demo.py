# src/seed_demo.py
"""Seed leads.json with sample completed intakes for portal demo."""
from __future__ import annotations

import json
from pathlib import Path

from case_packet import CasePacket

DATA_DIR = Path(__file__).parent.parent / "data"


def seed():
    leads = []

    # Lead 1: BayBridge rear-end (attorney review)
    p1 = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    p1.update("caller.full_name", "Maria Garcia")
    p1.update("caller.phone", "+15105551234")
    p1.update("caller.relation_to_victim", "self")
    p1.update("accident.type", "car")
    p1.update("accident.date", "2026-05-29")
    p1.update("accident.description", "Rear-ended on I-880 in Oakland")
    p1.update("accident.location.city", "Oakland")
    p1.update("accident.location.state", "CA")
    p1.update("injuries.status", "in_treatment")
    p1.update("injuries.description", "Neck pain")
    p1.update("injuries.passengers_injured", True)
    p1.update("medical.facility_name", "Highland Hospital")
    p1.update("medical.ambulance_used", False)
    p1.update("legal.police_report_filed", "yes")
    p1.update("routing.priority", "high")
    p1.update("routing.subtype", "rear_end_clear_liability")
    p1._data["triage"] = {
        "path": "review",
        "firm_id": "BayBridge Auto Injury",
        "priority": "high",
        "reason": "Bay Area rear-end with ER visit and minor in vehicle. Strong fit for BayBridge.",
        "moss_scores": [{"firm": "BayBridge Auto Injury", "score": 0.94}],
    }
    p1._data["status"] = "new"
    leads.append(p1.to_dict())

    # Lead 2: Summit FedEx ER (referral)
    p2 = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    p2.update("caller.full_name", "James Thompson")
    p2.update("caller.phone", "+14085559876")
    p2.update("caller.relation_to_victim", "self")
    p2.update("accident.type", "truck")
    p2.update("accident.date", "2026-06-01")
    p2.update("accident.description", "FedEx delivery van hit me in San Jose, went to ER")
    p2.update("accident.location.city", "San Jose")
    p2.update("accident.other_party.is_commercial", True)
    p2.update("accident.other_party.company_name", "FedEx")
    p2.update("injuries.status", "hospitalized")
    p2.update("caller.consent_to_contact", True)
    p2.update("routing.priority", "high")
    p2.update("routing.assigned_firm", "Summit Commercial Auto")
    p2._data["triage"] = {
        "path": "referral",
        "firm_id": "Summit Commercial Auto",
        "priority": "high",
        "reason": "Commercial vehicle + ER. Best fit for Summit.",
        "moss_scores": [
            {"firm": "Summit Commercial Auto", "score": 0.92},
            {"firm": "BayBridge Auto Injury", "score": 0.65},
        ],
    }
    p2._data["status"] = "placing"
    leads.append(p2.to_dict())

    # Lead 3: Decline (property damage only)
    p3 = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    p3.update("caller.full_name", "Tom Wilson")
    p3.update("caller.phone", "+15105553333")
    p3.update("caller.relation_to_victim", "self")
    p3.update("accident.type", "car")
    p3.update("accident.description", "Someone scratched my parked car")
    p3.update("injuries.status", "unknown")
    p3.update("routing.priority", "declined")
    p3.update("routing.decline_reason", "property_damage_only")
    p3._data["triage"] = {
        "path": "decline",
        "firm_id": None,
        "priority": "declined",
        "reason": "No injury reported. Property damage only.",
        "moss_scores": [],
    }
    p3._data["status"] = "declined"
    leads.append(p3.to_dict())

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_DIR / "leads.json", "w") as f:
        json.dump(leads, f, indent=2, default=str)

    print(f"Seeded {len(leads)} demo leads to {DATA_DIR / 'leads.json'}")


if __name__ == "__main__":
    seed()
