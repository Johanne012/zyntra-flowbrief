# AI agent governance

ZYNTRA will use specialized agents with narrow responsibilities rather than one unrestricted autonomous operator.

## Registry
The database now tracks:
- Agent purpose, model provider/model name and policy version.
- Enabled/disabled/suspended state.
- Daily run, cost and runtime budgets.
- Allowed data classification.
- Explicit per-agent tool grants and their approval status.
- Run metadata, token/cost totals, input/output hashes and approval references.

## Safety defaults
- Every agent is disabled by default.
- Human approval is required by default and cannot be disabled for active agents.
- Write tools require human approval.
- Financial execution and signing tool names are blocked by database constraints.
- No API keys, wallet secrets or service-role credentials are stored in agent tables.
- Run logs store hashes and metadata, not raw prompts, private data or secrets.

## Allowed first agents
1. Research and market intelligence (public sources only).
2. Support drafting (approved knowledge sources; human review).
3. Marketing drafting (no automatic publication until approved).
4. QA/test generation (branch-scoped code changes, CI required).
5. Finance reconciliation suggestions (read-only; no journal posting).
6. Operations reporting (read-only aggregate metrics).

## Forbidden capabilities
Agents must not sign transactions, move funds, initiate refunds/payouts, place broker orders, approve KYC/KYB, freeze accounts, change provider eligibility or alter legal/compliance state.

## Activation requirements
Before enabling any agent, define its task scope, data classification, tool allowlist, budget, evaluation suite, prompt-injection defenses, escalation path, logs, kill switch and owner. No agent has been activated yet.
