import json
import pytest
from pathlib import Path
from case_packet import CasePacket
from leads_store import LeadsStore


@pytest.fixture
def tmp_store(tmp_path):
    return LeadsStore(tmp_path / "leads.json")


def test_save_and_load(tmp_store):
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    packet.update("caller.full_name", "Maria Garcia")
    tmp_store.save_lead(packet)

    loaded = tmp_store.get_lead(packet.packet_id)
    assert loaded is not None
    assert loaded["caller"]["full_name"] == "Maria Garcia"


def test_list_leads_by_firm(tmp_store):
    p1 = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    p1.update("caller.full_name", "Maria")
    p2 = CasePacket.create(firm_id="Summit_Commercial_Auto")
    p2.update("caller.full_name", "James")
    tmp_store.save_lead(p1)
    tmp_store.save_lead(p2)

    bay_leads = tmp_store.list_leads(firm_id="BayBridge_Auto_Injury")
    assert len(bay_leads) == 1
    assert bay_leads[0]["caller"]["full_name"] == "Maria"


def test_update_lead(tmp_store):
    packet = CasePacket.create(firm_id="BayBridge_Auto_Injury")
    tmp_store.save_lead(packet)

    tmp_store.update_lead(packet.packet_id, {"routing": {"priority": "high"}})
    loaded = tmp_store.get_lead(packet.packet_id)
    assert loaded["routing"]["priority"] == "high"


def test_list_all_leads(tmp_store):
    for i in range(3):
        p = CasePacket.create(firm_id="firm")
        p.update("caller.full_name", f"Person {i}")
        tmp_store.save_lead(p)
    assert len(tmp_store.list_leads()) == 3
