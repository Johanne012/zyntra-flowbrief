import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/202611110010_ledger_posting_engine.sql", import.meta.url), "utf8");
const coreSql = await readFile(new URL("../supabase/migrations/202611110003_platform_core_v1.sql", import.meta.url), "utf8");
const api = await readFile(new URL("../supabase/functions/zyntra-post-ledger/index.ts", import.meta.url), "utf8");

test("ledger posting RPC is server-only", () => {
  assert.match(sql, /security definer/i);
  assert.match(sql, /revoke all on function public\.zyntra_post_ledger_transaction[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.zyntra_post_ledger_transaction[\s\S]*to service_role/i);
});

test("ledger enforces per-asset balancing and immutable posted journals", () => {
  assert.match(coreSql, /having sum\(debit_atoms\) <> sum\(credit_atoms\)/i);
  assert.match(coreSql, /Posted ledger entries are immutable/i);
  assert.match(coreSql, /zyntra_ledger_transaction_immutable/i);
  assert.match(sql, /request_hash/);
});

test("API accepts integer atom strings only and checks one-sided entries", () => {
  assert.match(api, /typeof entry\.debit_atoms!=="string"/);
  assert.match(api, /BigInt\(entry\.debit_atoms\)/);
  assert.match(api, /Each entry must be either a debit or a credit/);
  assert.match(api, /zyntra_post_ledger_transaction/);
  assert.doesNotMatch(api, /parseFloat|Number\(entry\.(debit|credit)_atoms/);
});

test("ledger API is JWT protected by the deployment configuration", () => {
  assert.match(api, /auth\/v1\/user/);
  assert.match(api, /Access-Control-Allow-Origin/);
});
