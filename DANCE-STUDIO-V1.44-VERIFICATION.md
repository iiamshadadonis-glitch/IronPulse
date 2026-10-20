# V1.44 verification

The shipped application was checked with Node 24.19.0 and headless Chromium 153.0.8010.0. A release-candidate ZIP was CRC-tested, extracted to a separate directory and compared file-by-file against the working project before testing.

## Executed checks

- `npm run test:dance-v1.44`: 23 code, deployment, compatibility and database regression suites, including the real SQLite bulk-plan importer.
- Five shipped-DOM Chromium suites, run against the separately extracted project: browser, components, workflows, additions and native.
- Mobile viewports include 320px, 390px and 430px; short-phone image sorting uses 320×568. Desktop checks use 1366px.
- Browser suites fail on uncaught JavaScript errors and use synthetic API fixtures while blocking external requests.
- Archive CRC, full file-list retention, extraction and SHA-256 comparisons. All 1,227 files from the supplied V1.43 project remain present. All 251 original server/API/library/schema files other than the release middleware are byte-identical to that baseline.

## New V1.44 coverage

- Responsive integration category capacity / More contents at three widths.
- Native configuration rows, full-screen wizard dimensions, contextual help and close behavior across all ten integration categories, including legacy Blogger controls and all four advanced Marketing Integrations providers.
- Edit / Connect / Test / Disconnect source controls, separate Review, masked credential presence, original API Settings and Razorpay settings save payloads; connected Amazon SES Edit routing.
- Schedule outer gutters; Teaching Days multi-select in both schedule-only and coach-plus-schedule modes; original `FormData.classDays` values and updated row summary.
- Existing Page Edit / Delete actions; top-layer warning with Cancel; direct FAQ Editor / Review with 16px padding.
- Scrolling Header Preview; compact menu rows; original rename and reorder requests; restoration of desktop labels / buttons.
- Two-column email templates, single-row canvas actions, 44px hit-tested insertion buttons, shared step sheet and original node insertion.
- Desktop accordion restoration and narrow-phone overflow.

## Retained coverage

Dashboard stability and metric carousels; client cards and details; overview list cards; search/filter sheets; chart controls and context-sensitive help; statement/invoice/refund layering and original local PDF generation; refund approval routing; Sales subscription/one-time/plan wizards; Product Images upload/crop/preview/sort/save bindings; placements; Current/Past Members; social media upload handlers and exact wizard flows; polls; automation triggers, flow-model insertion and activity cards; Dance Tips and advertisements; Page save / New Page / Custom Code; stories; Approvals; Tracking review; Heat Maps lazy preview / overlay / FAB; Coach / Student shared forms.

## Scope and practical limits

Tests use local synthetic records. No production login, gateway refund, OAuth connection, social publication, automation activation or live email is performed. Existing integration server handlers, business database schema, authentication and payment/refund processing are unchanged. No new migration or database reset is required.

Run browser checks with a compatible local Playwright installation and Chromium. If those are outside this project, set `DROPBEAT_PLAYWRIGHT_MODULE` and `DROPBEAT_CHROMIUM_PATH`; optional `DROPBEAT_TEST_OUTPUT` selects the evidence directory. Then run `npm run test:dance-v1.44:browser`. The source/database command needs Node 22.13 or newer.

Included verification logs record the actual final runs. Release notes list the fixes in this replacement; the manifest records changed/added files and their hashes.

