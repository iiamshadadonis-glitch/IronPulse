# IronPulse Gym

The complete working application is at this project root. All 1,829 original V1.00 files are preserved under archive/V1.00/. Read COMPARISON.md for the audited counts and FILE-COMPARISON.csv for every original file.

Complete Cloudflare Pages, Pages Functions/Workers and D1 replacement project, release **V1.05**, package **1.5.0**.

This folder contains the complete application, rather than changed files only. The frontend, backend, assets and all migrations are included. See PACKAGE-CONTENTS.txt for the full inventory and GITHUB-SUMMARY.txt for the commit title/description.

For the publishing error in the screenshot, open **CLOUDFLARE-FIX.md**.

Start with **START-HERE.md** for the noncoder deployment instructions. The existing D1 binding DB points to **893e7d29-fa72-413d-9415-5d93b1c3bc6e**.

This release retains the existing membership, scheduling, checkout, payment, notifications, CRM, Admin and portal logic. The 177 inherited CSS files retain their theme declarations. Physical filenames and remaining display/default brand text were cleaned up for the gym instance. Historical release notes, deployment scripts and verification files are preserved in archive/ for comparison; the current root project supplies the live gym configuration.

## V1.05 public Fitness Tips fixes

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
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    node tools/verify-gym-package.mjs

Browser tests require Playwright Chromium: npx playwright install chromium. Runtime tests use temporary local D1 state and do not change your remote database.

Deployment commands and their required account access are explained in START-HERE.md. The optional d1:migrate:remote command is for intentionally applying the original migration history to a fresh database. Normal Pages deployment uses the existing runtime schema initialization; do not replay migration history over a database already initialized by the application.

The source-compatible backend/frontend fingerprints and migration/schema fingerprints are recorded in tests/gym-baseline-contracts.json, derived from the supplied gym V1.00 ZIP. The original compatibility baseline remains intact. The V1.04 exceptions remain audited in verification/ironpulse-v1.04/frontend-fixes.json. The single V1.05 renderer exception, new stylesheet and 30 protected existing functions are recorded in verification/ironpulse-v1.05/public-fitness-tips-fixes.json. Backend, migration and inherited theme files retain their prior fingerprints.

PWA logos, icons and gym imagery are included locally. See docs/GYM-ASSETS.md. Third-party icon notices are retained in THIRD-PARTY-NOTICES.txt.

A configured database ID and a successful local build do not constitute a live Cloudflare deployment. Live publishing and provider configuration require the owning Cloudflare and provider accounts.
