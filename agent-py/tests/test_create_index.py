import json
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
from create_index import load_firm_documents, build_caserouter_indexes


SAMPLE_JSONL_LINE = json.dumps({
    "id": "BayBridge_Auto_Injury_firm_profile",
    "firm": "BayBridge Auto Injury",
    "type": "firm_profile",
    "title": "BayBridge Auto Injury firm profile",
    "text": "BayBridge covers Alameda, SF, San Mateo.",
    "metadata": {"coverage": ["Alameda"], "strong_fit": ["rear_end"]},
})


def test_load_firm_documents(tmp_path):
    jsonl_path = tmp_path / "docs.jsonl"
    jsonl_path.write_text(SAMPLE_JSONL_LINE + "\n")

    docs = load_firm_documents(jsonl_path)
    assert len(docs) == 1
    assert docs[0].id == "BayBridge_Auto_Injury_firm_profile"
    assert "BayBridge" in docs[0].text


def test_load_firm_documents_groups_by_firm(tmp_path):
    lines = [
        json.dumps({"id": "bay_1", "firm": "BayBridge", "type": "profile", "title": "t", "text": "Bay text", "metadata": {}}),
        json.dumps({"id": "sum_1", "firm": "Summit", "type": "profile", "title": "t", "text": "Summit text", "metadata": {}}),
    ]
    jsonl_path = tmp_path / "docs.jsonl"
    jsonl_path.write_text("\n".join(lines) + "\n")

    docs = load_firm_documents(jsonl_path)
    assert len(docs) == 2

    by_firm = {}
    for d in docs:
        firm = d.metadata.get("firm", "unknown")
        by_firm.setdefault(firm, []).append(d)
    assert "BayBridge" in by_firm
    assert "Summit" in by_firm


@pytest.mark.asyncio
async def test_build_caserouter_indexes():
    mock_client = MagicMock()
    mock_client.create_index = AsyncMock(return_value=MagicMock(
        job_id="test-job", index_name="test", doc_count=1
    ))

    from moss import DocumentInfo
    docs = [DocumentInfo(id="test", text="test doc", metadata={"firm": "BayBridge"})]

    await build_caserouter_indexes(
        client=mock_client,
        all_docs=docs,
        firm_ids=["BayBridge"],
        model_id="moss-minilm",
    )

    # Should create: 1 per-firm index + 1 combined index + 1 call-memory seed = 3 calls
    assert mock_client.create_index.call_count == 3
