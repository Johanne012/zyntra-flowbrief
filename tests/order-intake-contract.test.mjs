import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../order.html", import.meta.url), "utf8");

test("order form targets the deployed Supabase intake function", () => {
  assert.match(html, /functions\/v1\/zyntra-order-intake/);
  assert.match(html, /sb_publishable_/);
});

test("form has a honeypot and accessible response status", () => {
  assert.match(html, /name="website"/);
  assert.match(html, /aria-live="polite"/);
});

test("public order form does not expose direct crypto payment instructions", () => {
  assert.doesNotMatch(html, /bc1q[a-z0-9]{20,}/i);
  assert.doesNotMatch(html, /name="txid"/i);
  assert.match(html, /لا ترسل أي دفعة قبل استلام عرض وفاتورة/);
});

test("form uses global market options and supported package codes", () => {
  assert.match(html, /value="Global"/);
  for (const code of ["starter", "growth", "pro", "export", "starter_maintenance"]) {
    assert.match(html, new RegExp('value="' + code + '"'));
  }
});
