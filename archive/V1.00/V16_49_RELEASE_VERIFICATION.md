# Urgent Casting V16.49 — Release Verification

## Scope
V16.49 keeps the V16.48 application logic and theme, and adds the requested admin organization changes:

- **Social Media API** is renamed to **Integrations**.
- Integrations is organized into: **Social Media, SEO, Storage, Email & OTP, Payments, Ad Networks, API Settings**.
- Existing Payments, Ad Integrations, and API Settings forms are re-used inside the Integrations workspace instead of creating replacement credential stores.
- Standalone sidebar entries for Payments, Ad Integrations, and API Settings are removed from the final menu.
- Connected/status badges are shown on the integration cards and category grids.
- Each category has a horizontally safe CSS grid with Integration, Capabilities, Status, and Actions.
- Edit opens the existing form; enable/disable routes through the existing save controls; Delete is explicit, confirmation-protected, and scoped to the selected integration.
- Brand Settings includes **Marquee Tab Title Effect** beneath the existing admin information controls.
- Browser-title marquee is disabled by default and, when enabled, advances one character at a time on a `requestAnimationFrame` clock.

## Preservation checks
- Loading or refreshing Integrations performs GET/status operations only and does **not** clear saved credentials.
- Existing integration data remains in the same existing settings records.
- Delete actions were added as explicit admin-only actions and were unit-tested to clear only the selected integration.
- No database migration is required for V16.49 because the new flags/status metadata live in the existing JSON settings records.
- Existing color/theme variables were re-used; no theme palette was changed.

## Verification performed
- 253 JavaScript files: `node --check` — **PASS**
- 154 Cloudflare Function JavaScript modules: import/load check — **PASS**
- JSON / JSONC parse checks — **PASS**
- 25 HTML files parsed (24 full documents + 1 footer partial) — **PASS**
- 67 CSS files structural brace checks — **PASS**
- 610 local HTML asset references — **PASS**, 0 missing
- V16.49 integration endpoint behavior test — **PASS**
  - GET/status refresh is non-mutating
  - Facebook delete clears only Facebook credentials
  - Facebook reconfiguration clears its deleted marker without changing Instagram
  - Razorpay delete clears only Razorpay and preserves PhonePe/Stripe credentials
  - SEO connection delete clears Blogger/SEO fields while preserving the external API token
- V16.49 static structural assertions for menu merge, category tabs, grids, marquee setting and page script coverage — **PASS**

## Environment note
The container-provided Chromium binary does not complete even a minimal headless `data:` page in this runtime, so browser rendering was not used as a release gate. This is an environment limitation rather than an application test failure; syntax, module, parser, asset, structural, and endpoint-behavior checks above all pass.
