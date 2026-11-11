import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/202611110012_provider_route_governance.sql", import.meta.url), "utf8");
const api = await readFile(new URL("../supabase/functions/zyntra-create-payment-intent/index.ts", import.meta.url), "utf8");
const bindingSql = await readFile(new URL("../supabase/migrations/202611110014_payment_intent_route_binding.sql", import.meta.url), "utf8");

test("provider routes are tenant-scoped and disabled by default", () => {
  assert.match(sql, /create table if not exists public\.zyntra_provider_routes/);
  assert.match(sql, /enabled boolean not null default false/);
  assert.match(sql, /approval_status text not null default 'pending'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.zyntra_provider_routes from anon, authenticated/);
});

test("organization onboarding stores the legal entity country", () => {
  assert.match(sql, /incorporation_country text/);
  assert.match(sql, /status <> 'active' or incorporation_country is not null/);
  assert.match(sql, /Provider route merchant country must match organization incorporation country/);
});

test("payment intent creation requires an approved, enabled provider route", () => {
  assert.match(api, /zyntra_provider_routes\?select/);
  assert.match(api, /approval_status=eq\.approved/);
  assert.match(api, /enabled=eq\.true/);
  assert.match(api, /No approved payment route/);
  assert.match(api, /zyntra_payment_providers\?select=id&enabled=eq\.true/);
});

test("payment amount comparisons retain integer precision", () => {
  assert.match(api, /BigInt\(amountAtoms\)/);
  assert.match(api, /min_amount_atoms_text:min_amount_atoms::text/);
  assert.match(api, /amount_atoms_text:amount_atoms::text/);
});

test("payment intents persist the approved provider route decision", () => {
  assert.match(bindingSql, /provider_route_id uuid/);
  assert.match(bindingSql, /references public\.zyntra_provider_routes/);
  assert.match(api, /provider_route_id: eligibleRoute\.id/);
  assert.match(api, /amount_atoms_text:amount_atoms::text/);
});
