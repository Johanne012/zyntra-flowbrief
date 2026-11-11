import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const api = await readFile(new URL("../supabase/functions/zyntra-org-activity/index.ts", import.meta.url), "utf8");
const js = await readFile(new URL("../console/app.js", import.meta.url), "utf8");
test("organization activity requires JWT and verifies membership", () => {
  assert.match(api, /auth\/v1\/user/);
  assert.match(api, /zyntra_organization_members/);
  assert.match(api, /Organization access denied/);
});
test("organization activity is read-only and tenant scoped", () => {
  assert.match(api, /organization_id=eq\./);
  assert.match(api, /limit=25/);
  assert.match(api, /read_only:true/);
  assert.match(api, /zyntra_ai_agents/);
  assert.match(api, /agent_catalog:agentCatalog/);
  assert.match(js, /agent_catalog/);
  assert.doesNotMatch(api, /method:\s*"PATCH"|method:\s*"DELETE"/);
});
test("console renders activity as text rather than HTML", () => {
  assert.match(js, /zyntra-org-activity/);
  assert.match(js, /td\.textContent=/);
  assert.doesNotMatch(js, /innerHTML/);
});
