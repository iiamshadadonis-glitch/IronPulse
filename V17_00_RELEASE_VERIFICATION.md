# V17.00 Release Verification

## Automated checks

- `npm run test:v17.00` — passed, including inherited V16.88–V16.99 regression checks.
- JavaScript syntax validation across every browser and Functions JavaScript file — passed.
- Cloudflare Pages Functions compilation with Wrangler 4.132.0 — passed (`Compiled Worker successfully`).
- The V17.00 visitor endpoint test confirms that `view=list` performs one data query instead of also executing the four analytics scans.
- The edge-cache test confirms that distinct browser cache-busting query strings reuse one cached public response.
- The attendee-list PDF generator returns a valid PDF payload.

## Verified behavior

- Visitor page journeys show five badges initially, then one expandable remainder.
- Badges open exact URLs in new tabs; hover exposes the full URL; blog URLs retain exact targets behind a compact Blog label.
- Excel-compatible exports preserve one hyperlink for every visited page.
- Visitor location output uses `City, Region, Country` when Cloudflare supplies the fields.
- Modal selector misuse that produced `querySelector is not a function` is removed.
- Automatic email fields are locked initially and every template has independent preview, help, revert and guarded save actions.
- Template saving requires both a visual comparison and a separate warning confirmation.
- Checkout administrator notification settings validate destinations and report integration readiness.
- Existing order/payment paths, webinar customer reminders and branded email templates remain additive and intact.

## Database and deployment

- This release creates required columns, tables and indexes through the existing idempotent schema initializer.
- There is no V17.00 migration file and no need to run `npm run d1:migrate:remote`.
- Replace/deploy the complete package through the same Cloudflare Pages workflow already used for prior replacements.
