import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../order.html", import.meta.url), "utf8");

test("order form targets the deployed Supabase intake function", () => {
  assert.match(html, /functions\/v1\/zyntra-order-intake/);
  assert.match(html, /sb_publishable_/);
});

test("order form no longer uses mailto as its submission handler", () => {
  assert.doesNotMatch(html, /<form[^>]+mailto:/i);
  assert.match(html, /fetch\("https:\/\/ijbmdftluptwnglryaqx\.supabase\.co\/functions\/v1\/zyntra-order-intake"/);
});

test("form warns that submitted TxIDs are not verified payments", () => {
  assert.match(html, /لا يعني تأكيد الدفع/);
  assert.match(html, /submitted_unverified|TxID/);
});

test("form includes a honeypot and user-visible status region", () => {
  assert.match(html, /name="website"/);
  assert.match(html, /aria-live="polite"/);
});
