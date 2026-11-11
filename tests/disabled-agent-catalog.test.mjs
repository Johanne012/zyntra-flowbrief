import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const sql = await readFile(new URL("../supabase/migrations/202611110015_disabled_global_agent_catalog.sql", import.meta.url), "utf8");
const governance = await readFile(new URL("../supabase/migrations/202611110013_ai_agent_governance.sql", import.meta.url), "utf8");
test("global AI agent catalog is seeded disabled and registry-only", () => {
  for (const key of ["marketing", "support", "research", "profit"]) assert.match(sql, new RegExp("'" + key + "'"));
  assert.match(sql, /'disabled'/);
  assert.match(sql, /'registry_only'/);
  assert.match(sql, /'external_writes', false/);
  assert.match(sql, /'financial_execution', false/);
  assert.match(sql, /where not exists/);
});
test("agent governance requires human approval and blocks financial tools", () => {
  assert.match(governance, /human_approval_required boolean not null default true/);
  assert.match(governance, /payment_charge\|payment_refund\|ledger_post/);
  assert.match(governance, /wallet_sign\|wallet_transfer/);
  assert.match(governance, /broker_order\|trade_execute\|custody/);
});
