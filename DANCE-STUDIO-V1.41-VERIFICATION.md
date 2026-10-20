# V1.41 verification

## Automated regression

Run `npm run test:dance-v1.41` from this folder. The command runs 23 passing release, deployment, SQLite/import and existing functional regression suites, covering V17.09 through V16.88 compatibility.

The release checks confirm one active V1.41 mobile controller in all three dashboard shells, matching edge delivery, removal of older controllers, no-store dashboard HTML, mobile-only overrides, valid JavaScript and unchanged core business files. The real SQLite importer checks retain V1.40 plan/offer, billing, trial, class mapping, image and placement behavior.

## Real-browser verification

Two Chromium suites exercise the actual shipped HTML, CSS and JavaScript with synthetic API responses. No production account or live gateway is contacted.

`npm run test:dance-v1.41:browser` runs:

- `tools/verify-mobile-v1-41-browser.mjs`: initial/delayed dashboard stability, two-card/max-two-row metrics, subscription and plan forms, Search Customer, client stats/tabs, nested filter choices, chart touch scrolling, calendar/attendance cards, Product Images/crop/order/save, Dance Tip/Advertisement forms, bulk import, desktop isolation and Coach/Student form workflows.
- `tools/verify-mobile-v1-41-components.mjs`: shared Search/dashboard card layouts at 320/390/430px, metric counts 0/1/4/6/8/12/20 with balanced rows and changing pagers, Visitors/Repeat Visitors/Traffic Sources, eight subscription overview views, Most Visited data/chips, nested statement filters, statement/invoice PDF generation using original handlers, invoice step isolation/Review/Back, refund payment selection/prefill/amount validation/Review/approval layering, saved-image ordering at 320×568, Growth tabs/quick periods/Filter FAB, shared Growth/Marketing chart icon segments, legacy help interception (including Posts capability helpers), document dark modes and date-row affordance.

Mobile checks include 320, 360, 390 and 430px widths and light/dark layouts. Desktop isolation uses a fresh 1366×900 session. The stability check crosses the existing delayed installer stages. Image sorting verifies that the original move API receives the original direction value. Refund navigation stops at the existing approval screen and verifies that it has not sent a refund request.

Statement and invoice tests generate actual PDF files locally and verify their PDF signatures. Existing authentication, schema, order creation, gateway, checkout, class/attendance and portal business modules are checked for unchanged hashes. Browser screenshots and synthetic PDFs are test outputs, not replacement project assets.

The browser suites require Playwright and Chromium. They accept `DROPBEAT_PLAYWRIGHT_MODULE`, `DROPBEAT_CHROMIUM_PATH`, `DROPBEAT_TEST_OUTPUT` and `DROPBEAT_TEST_ROOT` for an existing test runtime. Run the regression command without these tools for the standard deployment checks.

## Archive verification

The complete ZIP is CRC-tested, extracted again and checked against the source file list and per-file hashes. The regression command is also run from that extracted replacement folder. `V1.41-RELEASE-MANIFEST.json` records the changed/added files relative to the attached V1.40 ZIP.

Deployment to your production account and live financial transactions are outside these local verification runs. The original deployment configuration and gateway handlers are retained.
