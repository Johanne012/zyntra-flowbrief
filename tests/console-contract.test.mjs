import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../console/index.html", import.meta.url), "utf8");
const js = await readFile(new URL("../console/app.js", import.meta.url), "utf8");
const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

test("console loads only same-origin script and stylesheet", () => {
  assert.match(html, /src="\/console\/app\.js" defer/);
  assert.match(html, /href="\/console\/styles\.css"/);
  assert.doesNotMatch(html, /<script>[^]*?<\/script>/i);
});

test("console does not persist access tokens in browser storage", () => {
  assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(js, /service_role|sb_secret_/i);
});

test("console calls only the scoped authenticated Edge Function endpoints", () => {
  for (const endpoint of ["zyntra-my-organizations", "zyntra-create-organization", "zyntra-org-dashboard"]) {
    assert.match(js, new RegExp(endpoint));
  }
  assert.match(js, /auth\/v1\/token\?grant_type=password/);
});

test("console routes include a restrictive Content Security Policy", () => {
  const headers = config.headers.filter((item) => item.source.startsWith("/console"));
  assert.equal(headers.length, 2);
  for (const route of headers) {
    const csp = route.headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
  }
});

test("console contains no direct wallet address or payment form", () => {
  assert.doesNotMatch(html + js, /bc1q[a-z0-9]{20,}/i);
  assert.doesNotMatch(html + js, /private key|seed phrase|mnemonic/i);
});

test("signup confirmation returns to the console", () => {
  assert.match(js, /auth\/v1\/signup\?redirect_to=/);
  assert.match(js, /window\.location\.origin\+"\/console\/"/);
});

test("organization onboarding requires a legal incorporation country", () => {
  assert.match(html, /id="incorporation-country"/);
  assert.match(js, /incorporation_country:/);
});

test("console exposes tenant-scoped read-only activity endpoint", () => {
  assert.match(js, /zyntra-org-activity/);
  assert.match(js, /loadActivity/);
  assert.match(js, /td\.textContent=/);
  assert.match(html, /data-view="activity"/);
  assert.match(html, /activity-panel/);
});
