"""JSON-file-backed leads store shared between agent and portal."""
from __future__ import annotations

import json
import fcntl
from pathlib import Path
from typing import Any

from case_packet import CasePacket


class LeadsStore:
    """Read/write case packets to a JSON file with file locking."""

    def __init__(self, path: Path | str) -> None:
        self._path = Path(path)

    def _read_all(self) -> list[dict[str, Any]]:
        if not self._path.exists():
            return []
        with open(self._path, "r") as f:
            fcntl.flock(f, fcntl.LOCK_SH)
            try:
                return json.load(f)
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)

    def _write_all(self, leads: list[dict[str, Any]]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._path, "w") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                json.dump(leads, f, indent=2, default=str)
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)

    def save_lead(self, packet: CasePacket) -> None:
        leads = self._read_all()
        for i, lead in enumerate(leads):
            if lead.get("packet_id") == packet.packet_id:
                leads[i] = packet.to_dict()
                self._write_all(leads)
                return
        leads.append(packet.to_dict())
        self._write_all(leads)

    def get_lead(self, packet_id: str) -> dict[str, Any] | None:
        for lead in self._read_all():
            if lead.get("packet_id") == packet_id:
                return lead
        return None

    def update_lead(self, packet_id: str, updates: dict[str, Any]) -> None:
        leads = self._read_all()
        for lead in leads:
            if lead.get("packet_id") == packet_id:
                self._deep_merge(lead, updates)
                break
        self._write_all(leads)

    def list_leads(self, firm_id: str | None = None) -> list[dict[str, Any]]:
        leads = self._read_all()
        if firm_id:
            return [l for l in leads if l.get("firm_id") == firm_id]
        return leads

    @staticmethod
    def _deep_merge(base: dict, updates: dict) -> None:
        for key, value in updates.items():
            if isinstance(value, dict) and isinstance(base.get(key), dict):
                LeadsStore._deep_merge(base[key], value)
            else:
                base[key] = value
