import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/202611110011_ledger_reversal.sql", import.meta.url), "utf8");
const api = await readFile(new URL("../supabase/functions/zyntra-reverse-ledger/index.ts", import.meta.url), "utf8");

test("reversal creates a new journal and never edits the original", () => {
  assert.match(sql, /insert into public\.zyntra_ledger_transactions/);
  assert.match(sql, /select v_reversal_id,account_id,asset_id,credit_atoms,debit_atoms/);
  assert.match(sql, /Original transaction has already been reversed/);
  assert.match(sql, /A reversal journal cannot itself be reversed/);
  assert.match(sql, /zyntra_ledger_one_reversal_per_original_idx/);
});

test("reversal RPC is server-only and records an audit event", () => {
  assert.match(sql, /revoke all on function public\.zyntra_reverse_ledger_transaction[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.zyntra_reverse_ledger_transaction[\s\S]*to service_role/i);
  assert.match(sql, /ledger\.transaction\.reversed/);
});

test("reversal API requires auth, a reason and an idempotency key", () => {
  assert.match(api, /auth\/v1\/user/);
  assert.match(api, /idempotency_key/);
  assert.match(api, /reason.length<8/);
  assert.match(api, /zyntra_reverse_ledger_transaction/);
});
