# tests/test_triage.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from case_packet import CasePacket
from triage import triage


def _mock_moss_result(firms_scores: list[tuple[str, float]]):
    result = MagicMock()
    docs = []
    for firm_name, score in firms_scores:
        doc = MagicMock()
        doc.text = f"{firm_name} firm profile"
        doc.score = score
        doc.metadata = {"firm": firm_name, "type": "firm_profile"}
        docs.append(doc)
    result.docs = docs
    return result


@pytest.fixture
def firms_data():
    return {
        "BayBridge_Auto_Injury": {"capacity_today": {"consult_slots_today": 3}},
        "Summit_Commercial_Auto": {"capacity_today": {"consult_slots_today": 1}},
        "Pacific_Complex_Collision": {"capacity_today": {"consult_slots_today": 0}},
        "Vista_Auto_Justice": {"capacity_today": {"consult_slots_today": 4}},
    }


@pytest.mark.asyncio
async def test_triage_already_represented(firms_data):
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("legal.already_has_attorney", True)
    mock_client = MagicMock()
    result = await triage(packet, mock_client, firms_data)
    assert result["path"] == "decline"
    assert result["reason"] == "already_represented"
    mock_client.query.assert_not_called()


@pytest.mark.asyncio
async def test_triage_fatal_urgent(firms_data):
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("caller.full_name", "Maria")
    packet.update("injuries.status", "fatal")
    packet.update("accident.type", "car")
    packet.update("accident.description", "fatal car accident")
    mock_client = MagicMock()
    mock_client.query = AsyncMock(return_value=_mock_moss_result([
        ("Summit Commercial Auto", 0.92),
        ("BayBridge Auto Injury", 0.85),
    ]))
    result = await triage(packet, mock_client, firms_data)
    assert result["priority"] == "urgent"
    assert result["firm_id"] is not None


@pytest.mark.asyncio
async def test_triage_skips_zero_capacity(firms_data):
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("caller.full_name", "Maria")
    packet.update("accident.type", "car")
    packet.update("accident.description", "multi-car pileup disputed liability")
    packet.update("injuries.status", "in_treatment")
    mock_client = MagicMock()
    mock_client.query = AsyncMock(return_value=_mock_moss_result([
        ("Pacific Complex Collision", 0.95),
        ("BayBridge Auto Injury", 0.80),
    ]))
    result = await triage(packet, mock_client, firms_data)
    assert result["firm_id"] != "Pacific_Complex_Collision"


@pytest.mark.asyncio
async def test_triage_incomplete_packet(firms_data):
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("caller.full_name", "Maria")
    mock_client = MagicMock()
    result = await triage(packet, mock_client, firms_data)
    assert result["path"] == "incomplete"
