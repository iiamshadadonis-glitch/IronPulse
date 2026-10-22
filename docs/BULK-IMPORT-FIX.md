> Historical release document. V1.09 restores V1.06 architecture, retains the V1.08 Bulk Import safeguards, and keeps only typed confirmation and Instautomate attribution from V1.07. Read SELECTIVE-ROLLBACK.md and the current root START-HERE.md for this release.

# V1.08 Bulk Import fix

This is a complete replacement of the supplied V1.07(1).zip. All 3,059 supplied paths remain included, along with the unchanged original V1.00 archive. The current application is at the project root; deploy that root rather than an archived release.

## What caused the reproducible loop

The application uses plain JavaScript and MutationObservers. There are no React effects or Vue watchers in this upload workflow. The CSV parser already uses an iterative parser and returns flat string records; it does not recursively clone File objects or layout data.

The original drop handler synchronously dispatched input/change events without protecting itself against a callback dispatching another drop. A controlled browser replay using the exact supplied V1.07 script reproduces Maximum call stack size exceeded. The patched handler accepts that drop once, dispatches input/change once and returns. A separate regression reproduces re-entry in upload rendering and Sales pane loading. The screenshot has no full JavaScript stack trace, so these targeted reproductions do not establish which callback was active in the production session.

Two compatibility Sales controllers could also activate and load the same pane through nested router wrappers. They now share a selection owner. The recovery wrapper installs once and ignores synchronous router re-entry while the requested Sales navigation is in progress. Direct tab selection still calls the original pane loader.

## Minimal application changes

| File | Safeguard |
| --- | --- |
| public/assets/gym-ui-components-v1-49.js | WeakSet guard around upload rendering; per-control drop guard; drag highlighting changes only at transitions and resets at boundary exit, drop, drag end and form reset |
| public/admin/gym-admin-v1-13.js | Shared Sales selection owner, bounded loader callbacks, one recovery wrapper and one pane load per navigation action |
| public/admin/final-v16-84-inbox-telegram-sales.js | Delegate to that selection owner while preserving the original fallback during early initialization |
| functions/_lib/gym-asset-manifest.js | Generated V1.08 hashes for all 415 CSS/JS assets |
| functions/_middleware.js | Release response header 1.8.0 only |

The exact before/after hashes are recorded in verification/ironpulse-v1.08/bulk-import-fixes.json. Eighty-nine unrelated named functions in the three affected frontend scripts retain their exact V1.07 source bytes.

Guards are released in finally blocks, so an exception does not disable later attempts. File objects remain in the native input; no JSON cloning of FileList, events or DOM objects was added. Selecting or dropping a file does not initiate an import. The existing submit/mobile Finish action performs validation and sends the request.

## Preserved behaviour and data

- All 179 CSS files, all 56 migrations, the CSV parser and import API match V1.07 byte-for-byte. No colour or theme declarations change.
- CSV headers, row limit, duplicate SKU handling, field validation, matching-SKU updates, row errors, authorization and retry behaviour retain their existing implementation.
- Existing membership, scheduling, checkout, payment, media, notifications, integrations and portal code outside the five-file application audit retain their supplied bytes.
- The DB binding remains DB with database ID 893e7d29-fa72-413d-9415-5d93b1c3bc6e. Schema, table names, JSON keys and stored roles are unchanged. No database migration is required.
- Prior Layout/theme confirmation, independent viewport visibility, footer attribution, Fitness Tips and cache fixes remain included.

## Verification

The current evidence is in verification/ironpulse-v1.08/. RELEASE-VERIFICATION-GYM.md records final counts and local test limits.

The focused browser suite covers empty required input, sample CSV delivery, tab/loader re-entry, native file selection, repeated rendering, recursive label callbacks, 200 dragover events, child boundary transitions, drag end, unsupported and disabled drops, re-entrant change callbacks, real API/SQLite creates and updates, malformed and oversized CSV, row errors, failed requests and retries, concurrent-submit prevention, the mobile wizard and repeated viewport changes.

The combined browser run also retains all earlier Admin/public Fitness Tips, branding, navigation, schedule, Layout/theme and footer checks. Runtime checks use authenticated HTTP calls through a real local Worker and isolated D1, starting both with all migrations and with an empty database. No live database or external account is used for these tests.

To repeat locally with Node 24:

```sh
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:gym:bulk-import
npm run test:gym:worker-browser
npm run test:gym:cache-browser
npm run test:gym:runtime
npm run test:gym:runtime:empty
```

## Apply the complete replacement

1. Extract V1.08.zip and copy all project contents into your existing gym repository, retaining its Git history. Keep public/, functions/, migrations/ and archive/ at the repository root.
2. Keep your existing Cloudflare project, secrets and gym DB. The current website is https://gym-fitness-3w8.pages.dev. Match name and SITE_URL in the root wrangler.jsonc to your existing gym project if they differ; retain the DB UUID above.
3. Commit and push the replacement to the branch connected to Pages. Use the title and description in GITHUB-SUMMARY.txt.
4. Pages build command: npm run build. Output directory: public. Node: 24. Deploy the new commit.
5. Confirm /release.json reports V1.08 and package_version 1.8.0. The build generates new fingerprinted script URLs, and existing HTML cache controls make the next navigation fetch the current page. An already open Admin tab should be reloaded after deployment so it loads the new scripts.
6. Open Business Ops → Sales → Bulk Import. Download the sample and select/drop a CSV to check filename feedback. Submit only records you intend to create or update: the unchanged importer updates matching SKUs.

No migration, database recreation, credential reset, theme change or new provider setup is needed for this fix. These packaged local checks do not publish the live site; the new Pages deployment applies the replacement.
