# IronPulse Gym

This V1.09 ZIP reissue repairs an incomplete saved archive. All application code is unchanged. Read EXTRACTION-HELP.txt before extracting and START-HERE.md before deployment.

The complete working application is at this project root. All 1,829 original V1.00 files are preserved under archive/V1.00/. Read COMPARISON.md for the audited counts and FILE-COMPARISON.csv for every original file.

Complete Cloudflare Pages, Pages Functions/Workers and D1 replacement project, release **V1.09**, package **1.9.0**.

This folder contains the complete application, rather than changed files only. The frontend, backend, assets and all migrations are included. See PACKAGE-CONTENTS.txt for the full inventory and GITHUB-SUMMARY.txt for the commit title/description.

For the publishing error in the screenshot, open **CLOUDFLARE-FIX.md**.

Start with **START-HERE.md** for the noncoder deployment instructions. The existing D1 binding DB points to **893e7d29-fa72-413d-9415-5d93b1c3bc6e**.

This release retains the existing membership, scheduling, checkout, payment, notifications, CRM, Admin and portal logic. All 179 inherited CSS files retain their exact bytes. Physical filenames and remaining display/default brand text were cleaned up for the gym instance in earlier releases. Historical release notes, deployment scripts and verification files are preserved for comparison; the current root project supplies the live gym configuration.

## V1.09 selective rollback to V1.06

Read docs/SELECTIVE-ROLLBACK.md. This release restores the supplied V1.06 layout renderer, registry, editor, workspace/navigation behaviour, asset-delivery implementation and original settings/colour flow. It retains all V1.08 Bulk Import safeguards, exact typed confirmation before publishing a new theme or saving Layout, and the Website designed by Instautomate attribution/link.

All 3,127 paths from the supplied V1.08(1).zip remain included. All 179 CSS files and all 56 migrations match V1.06 byte-for-byte. The three V1.08 Bulk Import scripts are copied exactly. Six architecture files are restored exactly to V1.06; the remaining exceptions are the isolated confirmation/attribution changes and current release metadata. No database migration is needed. Current evidence is in verification/ironpulse-v1.09/; GITHUB-SUMMARY.txt contains the copyable commit description.

The next sections describe retained fixes or historical releases. V1.07's new preview synchronization, layout normalization, footer immutability and settings commit order are not active in V1.09.

## Retained V1.08 Bulk Import stability

Read docs/BULK-IMPORT-FIX.md. The upload renderer and drop handler now stop synchronous callback re-entry, drag highlighting changes only at state transitions, and the two compatibility Sales controllers use one selection owner. A Sales navigation action loads its pane once, including when a loader calls the router again. No upload starts until the existing form is submitted.

The three V1.08 frontend safeguard scripts remain exact. The CSV parser, importer API, all 179 CSS files, all 56 migrations, schema, API JSON keys and D1 binding remain unchanged. V1.09 separately restores the V1.06 architecture described above. No migration is required. See verification/ironpulse-v1.08/ for historical source hashes and the baseline replay; verification/ironpulse-v1.09/ contains current evidence. GITHUB-SUMMARY.txt contains the copyable commit title and description.

## Historical V1.07 Layout/theme update

V1.07's additional Layout/Banners synchronization, draft preview, data normalization, workspace changes, canonical module delivery and immutable-footer boundary have been reverted to the V1.06 implementations. Only the requested typed confirmation and protected Instautomate attribution remain. docs/LAYOUT-THEME-SYNC.md and verification/ironpulse-v1.07/ are retained as historical records, rather than current instructions.

## Included V1.06 Worker layout delivery and cache busting

Read docs/FITNESS-TIPS-DELIVERY-FIX.md. Cloudflare's /blog route generates its own HTML shell and did not include the V1.05 card stylesheet. The middleware now adds the new card stylesheet last on every blog-list shell, including generated pages and aliases. Desktop cards use 24px padding/gaps; mobile cards use full-width images with absolutely positioned text, a dark gradient and the saved primary-colour button.

npm run build fingerprints all 415 CSS/JS files. HTML asset links and ES module dependencies receive release/build/content hashes in their URLs. HTML stays uncached and compatibility CSS/JS URLs revalidate. All 178 inherited stylesheets and every inherited public JavaScript file remain byte-identical to V1.05. All 267 other inherited backend files remain byte-identical; the middleware's business logic is checked byte-for-byte after removing its small delivery addon. The two new backend files only provide the asset manifest and delivery helpers.

Every one of the 2,926 supplied V1.05 paths remains included. The existing D1 binding, APIs, roles and migrations are retained. No migration is needed. The deployment helper builds assets before deployment and then handles CSS cache purging for a configured custom domain. For the current pages.dev address, Pages manages deployment cache refresh; the new URLs bypass earlier cached URLs. See the delivery-fix guide for exact deployment/cache steps.

## Included V1.05 public post fix

See docs/PUBLIC-FITNESS-TIPS-FIX.md for the exact changes. Single posts render the featured image once at the top. Matching cover copies are removed from the rendered body before adverts are inserted; saved content and separate illustrations remain intact. Desktop list cards use balanced image/text columns and 24px spacing. Mobile cards use a full-width image with readable title, excerpt and Read More overlay. The button follows the saved primary theme colour.

This update adds one page-scoped stylesheet and adjusts one public renderer. All 177 inherited CSS files, backend files, migrations and existing API contracts remain byte-identical to V1.04. Every one of the 2,869 paths from the attached V1.04 ZIP is retained. No database migration is needed.

## Included V1.04 Admin fix

See docs/FITNESS-TIPS-FIX.md for the root cause and exact scope. Two obsolete text writers repeatedly converted singular/plural labels and appended Updates. They have been removed. Image setup now avoids redundant DOM writes and watches only relevant structural changes. The legacy panel-title helper now respects the validated dynamic label store. Existing edit/save/upload wrappers and Posts tab selection are retained.

The earlier V1.04 fixes and their verification remain included.

## Compatibility

Stored account roles, database tables/columns, migration filenames and API JSON keys remain unchanged. Some technical names such as student, dance_styles_json and the existing /api/admin/dance-studio endpoint remain compatibility identifiers. They are not public-facing gym terminology. Renaming them would break existing integrations and conflict with the requested schema/API preservation.

The public dashboard is /member-dashboard; old dashboard URLs redirect to it. Old asset URLs also redirect to their new gym filenames. The existing theme choices and browser storage namespaces remain compatible.

Dynamic navigation and buttons continue to use dictionary/cache state from their first paint. Pending configuration uses skeletons, with bounded failure/Retry handling. The mobile and desktop browser checks cover these states.

## Commands

Requires Node 24.

    npm ci
    npm test
    npm run check:complete
    npm run build
    npm run test:gym:public-fitness
    npm run test:gym:browser
    npm run test:gym:worker-browser
    npm run test:gym:bulk-import
    npm run test:gym:rollback
    npm run test:gym:cache-browser
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    node tools/verify-gym-package.mjs

Browser tests require Playwright Chromium: npx playwright install chromium. Runtime tests use temporary local D1 state and do not change your remote database.

Deployment commands and their required account access are explained in START-HERE.md. The optional d1:migrate:remote command is for intentionally applying the original migration history to a fresh database. Normal Pages deployment uses the existing runtime schema initialization; do not replay migration history over a database already initialized by the application.

The source-compatible backend/frontend fingerprints and migration/schema fingerprints are recorded in tests/gym-baseline-contracts.json, derived from the supplied gym V1.00 ZIP. The original compatibility baseline remains intact. The V1.04 exceptions remain audited in verification/ironpulse-v1.04/frontend-fixes.json. The single V1.05 renderer exception, new stylesheet and 30 protected existing functions are recorded in verification/ironpulse-v1.05/public-fitness-tips-fixes.json. Backend, migration and inherited theme files retain their prior fingerprints.

V1.06's narrow middleware delivery exception, two asset helpers and added CSS are audited in verification/ironpulse-v1.06/asset-delivery-fixes.json. Tests restore the original middleware bytes by removing only those declared additions and retain the original database schema fingerprints.

PWA logos, icons and gym imagery are included locally. See docs/GYM-ASSETS.md. Third-party icon notices are retained in THIRD-PARTY-NOTICES.txt.

A configured database ID and a successful local build do not constitute a live Cloudflare deployment. Live publishing and provider configuration require the owning Cloudflare and provider accounts.
