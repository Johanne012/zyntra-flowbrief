import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/202611110013_ai_agent_governance.sql", import.meta.url), "utf8");

test("AI agents are disabled by default and budgeted", () => {
  assert.match(sql, /status text not null default 'disabled'/);
  assert.match(sql, /max_daily_runs/);
  assert.match(sql, /max_daily_cost_micro_usd/);
  assert.match(sql, /max_runtime_seconds/);
});

test("AI agent writes require human approval", () => {
  assert.match(sql, /human_approval_required boolean not null default true/);
  assert.match(sql, /status <> 'active' or human_approval_required/);
  assert.match(sql, /permission <> 'write_with_approval' or requires_human_approval/);
});

test("financial execution and signing tools are blocked", () => {
  assert.match(sql, /payment_charge\|payment_refund\|ledger_post\|wallet_sign\|wallet_transfer\|withdraw\|payout\|broker_order\|trade_execute\|custody/);
});

test("agent tables are server-only", () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.zyntra_ai_agents,public\.zyntra_ai_tool_grants,public\.zyntra_ai_agent_runs from anon,authenticated/);
});
