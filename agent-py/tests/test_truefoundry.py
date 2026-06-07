import pytest
from truefoundry_client import TrueFoundryClient, FirmPolicies


def test_default_policies():
    policies = FirmPolicies.defaults()
    assert policies.block_legal_advice is True
    assert policies.block_fee_discussion is True
    assert policies.block_case_valuation is True


def test_format_guardrails():
    policies = FirmPolicies.defaults()
    text = policies.format_for_prompt()
    assert "legal advice" in text.lower()
    assert "fee" in text.lower()


def test_firm_specific_policies():
    policies = FirmPolicies(
        block_legal_advice=True,
        block_fee_discussion=False,
        block_case_valuation=True,
        block_settlement_estimates=True,
        custom_rules=["Allow injury severity descriptions to caller"],
    )
    text = policies.format_for_prompt()
    assert "injury severity" in text.lower()
