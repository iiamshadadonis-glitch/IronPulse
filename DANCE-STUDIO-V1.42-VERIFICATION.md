# V1.42 verification

## Regression checks

`npm run test:dance-v1.42` runs the current release checks, real SQLite bulk-plan importer tests, deployment/conversion checks and the existing V17.09 through V16.88 compatibility suites: 23 passing suites.

Release checks verify one current mobile controller and one shared UI module in each dashboard shell, matching middleware delivery, retirement of older controllers, no-store dashboard HTML, JavaScript syntax and unchanged hashes for the original schema, authentication, order, gateway, checkout, portal, class/attendance, invoice/refund and crop business modules.

The optional Story tags control reuses the existing tags parser and stored post metadata; Poll uses the existing poll markup/payload. No server posting, scheduling, financial or automation execution implementation is replaced.

## Chromium browser checks

`npm run test:dance-v1.42:browser` runs three suites against the actual shipped HTML, JavaScript and CSS:

1. `tools/verify-mobile-v1-42-browser.mjs`: initial and delayed dashboard stability, two-card/max-two-row metrics, subscription and plan wizards, Search Customer, client layouts and dark modes, nested filter sheets, touch charts, calendars/attendance/rosters, full-screen gateway refund routing, Product Images/crop/order/save, Dance Tip/Advertisement forms, CSV import, fresh desktop isolation and Coach/Student forms. Async checks wait for actual rendered data rather than assuming a response arrives in a fixed number of milliseconds.
2. `tools/verify-mobile-v1-42-components.mjs`: shared client cards at 320/390/430px, metric counts 0/1/4/6/8/12/20 and rebuilt pagers, Visitors/Repeat Visitors/Traffic Sources, eight subscription overview lists, Most Visited chips, statement and invoice layering, nested date filters, original statement/invoice PDF generation, invoice Review/Back, refund payment selection/prefill/validation/Review/approval layering, small-screen image ordering, Growth/Marketing controls and global help sheets.
3. `tools/verify-mobile-v1-42-workflows.mjs`: exact shared disclosure path/20px size/1.8 stroke, unclipped tab badge geometry, four direct gateway routes with full-screen bounds, grouped Refund Records actions, Business → Visitors → Leads → Business help changes without reload, fresh context from the top Growth helper, editable compact Dot + Text legends, Heat Maps header/FAB/filter behavior, all seven post creation variants and their exact two/three-step structures, native media selection, original Drive upload handlers, uploaded-media validation, optional poll validation, Review-only publish buttons, media previews, Back preservation, carousel Add More, compact scheduling/month navigation/event agenda, flow cards, single-row automation actions, template chips/cards, trigger Apply/Close/reopen/Back behavior, desktop legend sizing and shared primitive availability in Coach/Student shells.

Browser checks use synthetic API fixtures. External requests are blocked. They do not publish a social post, activate an automation or send a live refund. Refund checks stop at the existing approval screen. PDF checks generate actual local PDF bytes and verify their signatures. Browser screenshots and PDFs are internal test outputs and are excluded from this replacement package.

The browser suites require an installed Playwright and Chromium runtime. They accept `DROPBEAT_PLAYWRIGHT_MODULE`, `DROPBEAT_CHROMIUM_PATH`, `DROPBEAT_TEST_OUTPUT` and `DROPBEAT_TEST_ROOT` when using an existing installation. Use Node 22.13 or newer for the SQLite checks. The normal deployment script runs the regression checks; browser tests are provided separately for UI verification.

## Complete archive checks

The replacement ZIP is CRC-tested and extracted into a separate directory. Its file list and SHA-256 hashes are compared with the source folder. All original files from the supplied V1.41 ZIP are retained. The regression command and all three Chromium suites are then run from the extracted replacement. `V1.42-RELEASE-MANIFEST.json` records additions, changes and per-file hashes.

Production deployment and live integration transactions are not part of these local checks. The existing Cloudflare Pages project, D1 binding, migrations, secrets and integration configuration are retained. No new migration or database reset is required.
