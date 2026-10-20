# DropBeat Dance Studio V1.10 Verification

## Automated coverage

The V1.10 release test creates a clean D1-compatible database, applies all 46 existing migrations, then verifies:

- business, visitor, lead and coach analytics use separate response modes;
- Business Results includes new subscriptions, renewals, one-time payments, failed payments, cancellations and refunds;
- class-type filtering excludes unrelated class records;
- anonymous visits are not counted as identified leads;
- Coach Results attributes saved activity to the linked coach;
- the legacy all-data response remains available to the Business Calendar;
- V1.10 frontend/admin assets and cache namespaces are active;
- the About coach grid has explicit previous/content/next columns;
- biography/tag progressive disclosure and 3/2/1 responsive card limits remain present;
- detailed help content exists for Plans, Create Subscription and One-Time Payment.

## Regression coverage

`npm run test:dance-v1.10` runs the complete DropBeat V1.10 → V1.02 suite, deployment/static-asset checks, the V17.09 → V16.88 application suite, D1 read-path tests, analytics period aggregation and payment/lead integration checks.

## Release validation checklist

- **Passed — JavaScript syntax:** every JavaScript file under `public/` and `functions/` was checked with `node --check`.
- **Passed — full regression:** `npm run test:dance-v1.10` completed the V1.10 → V1.02 DropBeat chain, deployment checks and V17.09 → V16.88 application integration checks.
- **Passed — Cloudflare build:** Wrangler compiled the complete Pages Functions directory successfully.
- **Passed — clean database:** all 46 migrations applied to an empty local D1 database; a second application reported `No migrations to apply`.
- **Passed — package integrity:** the ZIP passed `unzip -t`, excluded development-only `node_modules` and `.wrangler` folders, and installed successfully with `npm ci --ignore-scripts` after a clean extraction.
- **Passed — clean-package regression:** the complete `npm run test:dance-v1.10` chain passed again from the extracted ZIP.

These checks validate the supplied replacement code and package. They do not claim that a production deployment has occurred; the replacement must still be uploaded to the existing Cloudflare Pages project as described in `START-HERE-V1.10.md`.
