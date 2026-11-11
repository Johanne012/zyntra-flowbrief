import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const api = await readFile(new URL("../supabase/functions/zyntra-transition-order/index.ts", import.meta.url), "utf8");

test("order transition endpoint verifies platform admin using trusted app metadata", () => {
  assert.match(api, /auth\/v1\/user/);
  assert.match(api, /app_metadata\?\.zyntra_platform_admin!==true/);
  assert.match(api, /user\.id/);
});

test("order transition endpoint requires idempotency and bounds input", () => {
  assert.match(api, /idempotency-key/);
  assert.match(api, /length<8\|\|requestId\.length>128/);
  assert.match(api, /byteLength>2048/);
  assert.match(api, /reason\.length>500/);
});

test("order transition endpoint calls only the constrained RPC", () => {
  assert.match(api, /rpc\/zyntra_transition_order/);
  assert.doesNotMatch(api, /rest\/v1\/zyntra_orders/);
  assert.match(api, /p_actor_user_id:user\.id/);
});
