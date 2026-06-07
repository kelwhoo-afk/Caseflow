# tests/test_case_packet.py
import pytest
from case_packet import CasePacket


def test_create_empty_packet():
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    assert packet.packet_id is not None
    assert packet.created_at is not None
    assert packet.caller["full_name"] is None
    assert packet.routing["priority"] == "normal"
    assert packet.routing["assigned_firm"] is None


def test_update_field():
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("caller.full_name", "Maria Garcia")
    assert packet.caller["full_name"] == "Maria Garcia"


def test_update_nested_field():
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("accident.location.city", "Oakland")
    assert packet.accident["location"]["city"] == "Oakland"


def test_missing_fields():
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("caller.full_name", "Maria Garcia")
    missing = packet.missing_fields()
    assert "caller.phone" in missing
    assert "caller.relation_to_victim" in missing
    assert "caller.full_name" not in missing


def test_to_dict_and_from_dict():
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("caller.full_name", "Maria Garcia")
    packet.update("caller.phone", "+15105551234")
    d = packet.to_dict()
    restored = CasePacket.from_dict(d)
    assert restored.caller["full_name"] == "Maria Garcia"
    assert restored.packet_id == packet.packet_id


def test_hard_rule_already_represented():
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("legal.already_has_attorney", True)
    result = packet.check_hard_rules()
    assert result["auto_decline"] is True
    assert "already_represented" in result["reason"]


def test_hard_rule_fatal():
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("injuries.status", "fatal")
    result = packet.check_hard_rules()
    assert result["priority"] == "urgent"
