# AI Evaluation

## Current state

BARANGAY_AI has foundational deterministic checks:
- Input and output safety guards.
- Structured response schema validation.
- Citation identifier validation against retrieved source IDs.
- Existing API, voice, security, and frontend regression tests.

These checks are not a complete evaluation system. The repository does not yet establish
measured retrieval recall, claim-level evidence coverage, multilingual answer quality,
production latency percentiles, or cost baselines.

## Required evaluation suite

Maintain a versioned, reviewed dataset of resident questions in English, Filipino, and
Cebuano. Each case should include expected source IDs, approved facts, prohibited claims,
expected refusal behavior, and audience/role.

CI/staging should report:
- Retrieval Recall@k and nDCG.
- Citation precision and evidence coverage.
- Unsupported-claim rate and false-answer rate.
- Refusal correctness for missing, expired, conflicting, or unauthorized sources.
- Prompt-injection resistance for uploaded documents and retrieved passages.
- English, Filipino, and Cebuano answer quality.
- p50/p95 first-token and first-audio latency.
- Provider timeout, retry, failover, and cost rates.

## Release gates

- No resident retrieval may expose staff-only or private knowledge.
- No sensitive tool call may bypass backend authorization and ownership checks.
- Unsupported official fees, requirements, schedules, and policies must be refused.
- RAG retrieval and grounding regression tests must pass.
- Load, real-device voice, provider-outage, and rollback tests must pass before broad
  real-time voice enablement.

Performance and quality targets must be measured; do not record proposed targets as
achieved results.

See [ATE_SORA_AI_STACK.md](../ATE_SORA_AI_STACK.md) for the full architecture and
implementation maturity matrix.
