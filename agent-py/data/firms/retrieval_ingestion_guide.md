# Retrieval Ingestion Guide

## What to index in Moss

Index `moss_index_documents.jsonl`. Each line is a searchable document with:
- id
- firm
- type
- title
- text
- metadata

## Suggested retrieval calls

Query each transcript chunk against the index.

Examples:
- "rear-ended in Oakland" should retrieve BayBridge intake checklist and firm criteria.
- "8-year-old in the car" should retrieve safety policy and priority trigger.
- "FedEx delivery van and ER" should retrieve Summit criteria and referral consent policy.
- "three cars blaming each other" should retrieve Pacific complex collision criteria.
- "Los Angeles español" should retrieve Vista bilingual intake criteria.
- "no one was hurt scratched car" should retrieve property damage decline templates.

## What to show in demo mode

For each retrieval result, show:
- title
- firm
- type
- latency ms
- short explanation
- whether it affected next question, routing, safety, or consent.

## Guardrail docs

Index `shared_ai_safety_policy.md` and each firm's `05_referral_consent_policy.md`.
Use these to block:
- legal advice
- settlement estimates
- case-strength evaluation
- sharing referral packet without consent
