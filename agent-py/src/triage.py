"""Hybrid triage engine: hard rules + Moss semantic matching."""
from __future__ import annotations

from typing import Any

from moss import MossClient, QueryOptions

from case_packet import CasePacket

INCOMPLETE_THRESHOLD = 4


async def triage(
    packet: CasePacket,
    moss_client: MossClient,
    firms_data: dict[str, Any],
) -> dict[str, Any]:
    """Run triage on a completed case packet.

    Returns dict with: path, firm_id, priority, reason, moss_scores.
    """
    hard = packet.check_hard_rules()
    if hard["auto_decline"]:
        return {
            "path": "decline",
            "firm_id": None,
            "priority": "declined",
            "reason": hard["reason"],
            "moss_scores": [],
        }

    missing = packet.missing_fields()
    if len(missing) >= INCOMPLETE_THRESHOLD:
        return {
            "path": "incomplete",
            "firm_id": None,
            "priority": "normal",
            "reason": f"missing {len(missing)} required fields: {', '.join(missing)}",
            "moss_scores": [],
        }

    priority = hard.get("priority", "normal")

    query_parts = []
    if packet.accident.get("type"):
        query_parts.append(packet.accident["type"])
    if packet.accident.get("description"):
        query_parts.append(packet.accident["description"])
    if packet.accident.get("location", {}).get("city"):
        query_parts.append(packet.accident["location"]["city"])
    if packet.injuries.get("status") and packet.injuries["status"] != "unknown":
        query_parts.append(f"injury: {packet.injuries['status']}")
    if packet.injuries.get("description"):
        query_parts.append(packet.injuries["description"])

    triage_query = " ".join(query_parts) if query_parts else "auto accident injury"

    search_result = await moss_client.query(
        "all-firms",
        triage_query,
        QueryOptions(top_k=8),
    )

    firm_scores: dict[str, float] = {}
    for doc in getattr(search_result, "docs", []) or []:
        firm_name = getattr(doc, "metadata", {}).get("firm", "")
        score = float(getattr(doc, "score", 0))
        if firm_name and score > firm_scores.get(firm_name, 0):
            firm_scores[firm_name] = score

    for firm_id, firm_info in firms_data.items():
        display_name = firm_id.replace("_", " ")
        capacity = firm_info.get("capacity_today", {}).get("consult_slots_today", 0)
        if capacity <= 0 and display_name in firm_scores:
            del firm_scores[display_name]

    moss_scores = sorted(firm_scores.items(), key=lambda x: x[1], reverse=True)

    if not moss_scores:
        return {
            "path": "review",
            "firm_id": None,
            "priority": priority,
            "reason": "no firms matched with available capacity",
            "moss_scores": [],
        }

    best_firm = moss_scores[0][0]
    best_score = moss_scores[0][1]

    caller_firm = packet._data.get("firm_id", "").replace("_", " ")
    path = "review" if caller_firm in best_firm or best_firm in caller_firm else "referral"

    return {
        "path": path,
        "firm_id": best_firm,
        "priority": priority,
        "reason": f"Best match: {best_firm} (score: {best_score:.2f})",
        "moss_scores": [{"firm": f, "score": s} for f, s in moss_scores],
    }
