import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js = await readFile(new URL("../console/app.js", import.meta.url), "utf8");

test("admin order actions expose only governed status transitions", () => {
  assert.match(js, /received:\[\["reviewing","بدء المراجعة"\],\["cancelled","إلغاء"\]\]/);
  assert.match(js, /reviewing:\[\["awaiting_payment","إرسال إلى الدفع"\],\["cancelled","إلغاء"\]\]/);
  assert.match(js, /paid:\[\["in_progress","بدء التنفيذ"\]\]/);
  assert.match(js, /in_progress:\[\["delivered","تسجيل التسليم"\]\]/);
});

test("admin order mutations use the dedicated endpoint with concurrency and idempotency", () => {
  assert.match(js, /functions\/v1\/zyntra-transition-order/);
  assert.match(js, /expected_status:order\.order_status/);
  assert.match(js, /Idempotency-Key":crypto\.randomUUID\(\)/);
  assert.match(js, /window\.confirm/);
});

test("admin order content is rendered as text, never injected HTML", () => {
  assert.match(js, /td\.textContent=order\[key\]/);
  assert.doesNotMatch(js, /innerHTML/);
});
