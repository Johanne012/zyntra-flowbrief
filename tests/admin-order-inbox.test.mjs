import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const api = await readFile(new URL("../supabase/functions/zyntra-admin-orders/index.ts", import.meta.url), "utf8");
const js = await readFile(new URL("../console/app.js", import.meta.url), "utf8");
test("order inbox requires a verified platform administrator claim", () => {
  assert.match(api, /auth\/v1\/user/);
  assert.match(api, /app_metadata\?\.zyntra_platform_admin!==true/);
  assert.match(api, /Platform administrator access required/);
});
test("order inbox is read-only and bounded", () => {
  assert.match(api, /limit:String\(limit\)/);
  assert.match(api, /offset:String\(offset\)/);
  assert.match(api, /Math\.min\(100/);
  assert.match(api, /read_only:true/);
  assert.doesNotMatch(api, /method:\s*"PATCH"|method:\s*"DELETE"/);
});
test("console renders order inbox values as text", () => {
  assert.match(js, /loadAdminOrders/);
  assert.match(js, /zyntra-admin-orders/);
  assert.match(js, /td\.textContent=/);
  assert.doesNotMatch(js, /innerHTML/);
});
