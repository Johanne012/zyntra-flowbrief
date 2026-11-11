import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/20261111150000_order_transition_engine.sql", import.meta.url), "utf8");

test("order transitions are atomic and lock the target order", () => {
  assert.match(sql, /for update/i);
  assert.match(sql, /update public\.zyntra_orders[\s\S]*?insert into public\.zyntra_audit_events/i);
  assert.match(sql, /security definer[\s\S]*?set search_path = pg_catalog, public/i);
});

test("order transition RPC is restricted to trusted server role", () => {
  assert.match(sql, /revoke all on function public\.zyntra_transition_order[\s\S]*?from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.zyntra_transition_order[\s\S]*?to service_role/i);
});

test("order transitions enforce concurrency, allowlist and required evidence", () => {
  assert.match(sql, /v_order\.order_status <> p_expected_status/);
  assert.match(sql, /Order status transition is not allowed/);
  assert.match(sql, /Cancellation reason is required/);
  assert.match(sql, /Delivery evidence reference is required/);
});

test("order transition request ids are idempotent and audit events remain append-only", () => {
  assert.match(sql, /zyntra_order_transition_request_uidx/);
  assert.match(sql, /idempotent_replay/);
  assert.match(sql, /actor_user_id is distinct from p_actor_user_id/i);
  assert.match(sql, /details->>'from_status' is distinct from p_expected_status/i);
  assert.match(sql, /public\.zyntra_audit_events/);
});
