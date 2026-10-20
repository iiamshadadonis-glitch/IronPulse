# V1.40 verification

Verified on 14 October 2026 using Node.js 24.19.0, real local SQLite and Chromium 153.0.8010.0.

## Passing automated checks

**Command:** `npm run test:dance-v1.40`

All 23 current and inherited check suites passed. This includes:

- V1.40 release metadata, HTML/Functions delivery and stale-controller removal.
- Correct Cloudflare Pages configuration, existing D1 binding and local asset links.
- Syntax checks for the new controller, CSV UI, import adapter, import route, normal plan route and middleware.
- Nine protected core-file hashes: schema, portal login, order creation, gateway integration, public app, admin core, class/workspace controller, remuneration controller and portal core.
- Existing V17.09 through V16.88 checks covering navigation, integrations, email/OTP, automation, CRM, visitor reads, data integration and analytics periods.
- A real SQLite import workflow using the supplied migrations and normal schema initialization: complete sample, create/update, trials, billing interval, capacity thresholds, one-time class/access dates, placements, optional images and retry behavior.
- Invalid numbers, invalid dates, unavailable coaches, duplicate days, bad images, oversized features, duplicate SKUs, empty/oversized imports, legacy CSV headers and existing admin authorization.
- CSV handling for quoted commas, escaped quotes, empty cells, multiline content, BOM, malformed records and duplicate headers.
- Google Drive share-link normalization and repeat imports without duplicate images.
- Explicit page placements retained after the existing first-image default-placement logic.
- Zero external gateway or social-publishing calls from bulk import.

**Command:** `npm run test:dance-v1.40:browser`

Passed against the actual supplied HTML/CSS/JavaScript with synthetic API responses:

- Dashboard initial vs delayed layout (10-second observation), one pagination owner, two-card viewport, maximum two balanced rows and contained horizontal scrolling.
- Subscription/one-time form mode isolation, separate semantic steps, validation, original submission payload and close/reopen in Sales.
- Plan add/edit full viewport, hidden inactive sections, Plan Features as step four and independent Review as step five.
- Search Customer full-width cards, compact heights, three visited-page chips and the From/To/Search row.
- Client Details equal stat widths, compact header/footer, disclosures and a single row of tabs at 320px, 360px, 390px and 430px widths.
- Client light/dark rendering; stat cards do not receive the nested-record border class.
- Filter sheets, odd/even visible-field grids, nested selector sheets, original Apply behavior and portal statement filters.
- Class/attendance rigid value-column alignment, compact action controls, themed child borders, name/email spacing and coach step ownership.
- Refund information below its expanded accordion heading, compact search/open actions and full-screen refund forms.
- Product Images' four dedicated steps, conditional social fields, staged preview/order, read-only Review, original image-save payload, original crop handoff and existing image sorting action.
- Analytics Calendar's two-column daily totals and full-width final total, date list and day breakdown sheet.
- Dance Tip and Advertisement navigation into a full-screen wizard with a separate Review.
- Mobile bulk sample-download icon, file Review and import feedback.
- Native touch scrolling forward/back through line, vertical-bar and horizontal-bar charts; circular donut sizing.
- Desktop isolation at 1366px: no mobile form rewriting or mobile Add Plan launcher.
- Student and Coach form opening/closing, Review as the final step and role-specific dashboard titles.
- No exceptions from the V1.40 mobile controller.

## Scope

The browser API data is synthetic. No production record, payment, refund, gateway authorization, social post or deployment was created during verification.

The included deployment scripts run the current regression command before deploying. Browser checks additionally require a Playwright installation and Chromium. Tests accept `DROPBEAT_PLAYWRIGHT_MODULE`, `DROPBEAT_CHROMIUM_PATH` and `DROPBEAT_TEST_OUTPUT` when those tools live outside the project.

V1.40 does not require a new database migration. Existing secrets, bindings and business-data calculations are retained. The intentional server extension is Bulk Plan Upload; normal plan creation retains its original gateway-provisioning default.

The release ZIP is checked for archive integrity, source-file parity and a passing regression run after extraction.
