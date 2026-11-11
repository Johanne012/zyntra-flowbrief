import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pages = ["index.html", "how.html", "contact.html"];
const contents = await Promise.all(
  pages.map((path) => readFile(new URL("../" + path, import.meta.url), "utf8")),
);

test("public sales pages do not publish unverified crypto payment instructions", () => {
  for (let i = 0; i < pages.length; i++) {
    assert.doesNotMatch(contents[i], /Bitcoin|\\bBTC\\b|TxID|bc1q[0-9a-z]{20,}/i, pages[i]);
  }
});

test("payment is requested only after an official proposal and invoice", () => {
  assert.match(contents[1], /لا تدفع قبل استلام عرض وفاتورة وتعليمات دفع رسمية/);
  assert.match(contents[2], /فاتورتك/);
});
