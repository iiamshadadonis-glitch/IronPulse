# Urgent Casting V16.51 — Release Verification

## Baseline
- Source package: exact uploaded `urgent-casting-complete-replacement-v16.50(1).zip`.
- Source ZIP integrity: PASS before modification.
- Scope: targeted Integrations UI/help/status-spacing and public browser-tab marquee corrections only.

## Verification performed on working tree
- JavaScript syntax: 255 files — PASS (`node --check`).
- Cloudflare Function module imports: 154 modules — PASS.
- JSON parse: 1 file — PASS.
- JSONC parse: 1 file — PASS.
- HTML parser: 25 files — PASS.
- CSS structural checks: 69 files — PASS.
- Local static HTML asset references: 697 checked, 0 missing — PASS.
- V16.51 feature assertions: 29/29 — PASS.
- Marquee isolated runtime behavior test: disabled/fixed title PASS; enabled/requestAnimationFrame PASS; strict boolean enablement PASS.
- Backend preservation: entire `functions/` tree unchanged from V16.50 — PASS.
- Migration preservation: entire `migrations/` tree unchanged from V16.50 — PASS.
- `wrangler.jsonc` unchanged — PASS.
- `package.json` unchanged — PASS.

## Specific behavior assertions
- SEO Connection keeps the visible far-right status badge but hides the older inline status copy.
- A hidden `#uc48SeoBadge` compatibility sentinel remains, preventing the V16.48 compatibility renderer from repeatedly reconstructing the SEO summary.
- Google Indexing API inline `Eligible pages only` label is hidden; the unified far-right badge remains.
- Facebook/Instagram solution help lives in the active V16.8 card renderer and contains Meta app/permission/token setup guidance.
- Ad Network summary cards reserve space for both status badge and circular dropdown arrow.
- Duplicate API Settings Webhook Endpoints UI is hidden while the existing DOM/backend route support remains intact.
- Automation Endpoints uses the existing themed flip helper (`ucMakeInfoCard`) and therefore includes the existing themed information button and circular Back to form button.
- V16.51 UI code contains no new disconnect/delete API request.
- Marquee is disabled unless `marqueeTabTitleEnabled === true`, cancels the older legacy timeout and blocks the legacy unconditional starter.
- All public HTML references to the modified marquee controller use `?v=16.51`.

## Packaging verification
The final ZIP is re-extracted after creation and the same critical syntax, structure, asset-reference, feature and preservation checks are rerun against the exact packaged copy. The final ZIP hash is reported with the downloadable artifact.
