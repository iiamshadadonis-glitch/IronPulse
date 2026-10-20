# V1.43 verification

## Executed regression checks

The release was checked with Node 24.19.0 and headless Chromium 153.0.8010.0 using the shipped HTML, JavaScript and CSS.

- npm run test:dance-v1.43: current release/delivery checks, real SQLite bulk-plan import tests, conversion/deployment checks and the retained V17.09 through V16.88 compatibility checks — 23 suites.
- npm run test:dance-v1.43:browser: four browser suites, described below.
- The complete replacement ZIP is CRC-tested and extracted separately. Its file list and SHA-256 hashes are compared with the working source and supplied V1.42 archive. The regression command is also executed from the extracted ZIP.

## Browser coverage

1. tools/verify-mobile-v1-43-browser.mjs: delayed dashboard stability; one pager owner; two visible metrics and balanced maximum-two-row grouping; subscription, one-time and plan wizards; Search Customer and client layout; filters, charts, calendars, attendance and rosters; gateway refunds; image/crop/order/save; Dance Tip/Advertisement forms; bulk CSV; desktop isolation; Coach/Student forms.
2. tools/verify-mobile-v1-43-components.mjs: client cards at 320/390/430px; metric counts 0/1/4/6/8/12/20; visitor/source/subscription detail cards; Most Visited; statement/invoice/refund layering; original local PDF generation; refund prefill/Review/approval; saved-image reordering on a 320×568 screen; Growth/Marketing controls and help.
3. tools/verify-mobile-v1-43-workflows.mjs: exact shared disclosure geometry, tab badges, gateway routes, header action grouping, help content after tab changes, compact dot legends, Heat Maps filter, all seven social post types and original Drive upload handlers, free QA navigation with final validation, media previews, optional polls, carousel Add More, post calendar, automation templates, trigger Apply/Close and desktop/shared-portal behavior.
4. tools/verify-mobile-v1-43-additions.mjs: Sales closed-state launcher; native Product Images input binding; complete placements; synchronous Current/Past member rendering; running-class navigation/coach sheet; Dance Tip headers; all Social QA steps and final blank-submit guard; Poll header/footer bounds; DM/Comment/Comment-to-DM source-model insertion; Lead Nurturing rules/insertion; email child dialogs/activity cards; individual Page save payload; New Page/Custom Code; Story actions; Approvals metrics; platform-specific Tracking review; offscreen preview loading/idle overlay and FAB collision; mobile-to-desktop restoration; narrow-phone overflow.

Tests use synthetic API fixtures and block external requests. They do not publish a social post, activate an automation, send mail, issue a live refund or change a production database. Refund tests stop at the existing approval screen. PDF tests invoke the original local PDF handlers and verify PDF signatures.

## Preserved behavior

Release checks compare SHA-256 hashes for the original schema, authentication, order creation, payment gateways, public checkout, base admin/portal, class/attendance, invoice/refund and crop modules. All original V1.42 files are retained. Existing D1 binding, secrets, migration files and live integration settings remain in place; V1.43 requires no database reset or new migration.

Heat Maps uses a live website iframe. Tests verify deferred loading and overlay initialization, not a claimed production network speed. Actual production media size and loading time depend on the existing website assets and connection.

## Rerun

Use Node 22.13 or newer for the SQLite tests:

npm run test:dance-v1.43

For browser checks, install Playwright/Chromium or use an existing runtime, then run:

npm run test:dance-v1.43:browser

The runners accept DROPBEAT_PLAYWRIGHT_MODULE, DROPBEAT_CHROMIUM_PATH, DROPBEAT_TEST_OUTPUT and DROPBEAT_TEST_ROOT. Browser screenshots/PDFs are internal outputs and are excluded from the replacement ZIP. V1.43-RELEASE-MANIFEST.json lists changed/added files and their hashes.

Production deployment and live third-party transactions are outside these local checks.

