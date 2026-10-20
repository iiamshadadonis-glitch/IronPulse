# IronPulse Gym

Complete Cloudflare Pages, Pages Functions/Workers and D1 replacement project, release **V1.01**, package **1.1.0**.

Start with **START-HERE.md** for the noncoder deployment instructions. The existing D1 binding DB points to **893e7d29-fa72-413d-9415-5d93b1c3bc6e**.

This release retains the existing membership, scheduling, checkout, payment, notifications, CRM, Admin and portal logic. The 177 inherited CSS files retain their theme declarations. Physical filenames and remaining display/default brand text were cleaned up for the gym instance. Old release notes, old deployment scripts and historical verification files were removed.

## Compatibility

Stored account roles, database tables/columns, migration filenames and API JSON keys remain unchanged. Some technical names such as student, dance_styles_json and the existing /api/admin/dance-studio endpoint remain compatibility identifiers. They are not public-facing gym terminology. Renaming them would break existing integrations and conflict with the requested schema/API preservation.

The public dashboard is /member-dashboard; old dashboard URLs redirect to it. Old asset URLs also redirect to their new gym filenames. The existing theme choices and browser storage namespaces remain compatible.

Dynamic navigation and buttons continue to use dictionary/cache state from their first paint. Pending configuration uses skeletons, with bounded failure/Retry handling. The mobile and desktop browser checks cover these states.

## Commands

Requires Node 24.

    npm ci
    npm test
    npm run build
    npm run test:gym:browser
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    node tools/verify-gym-package.mjs

Browser tests require Playwright Chromium: npx playwright install chromium. Runtime tests use temporary local D1 state and do not change your remote database.

Deployment commands and their required account access are explained in START-HERE.md. The optional d1:migrate:remote command is for intentionally applying the original migration history to a fresh database. Normal Pages deployment uses the existing runtime schema initialization; do not replay migration history over a database already initialized by the application.

The source-compatible backend/frontend fingerprints and migration/schema fingerprints are recorded in tests/gym-baseline-contracts.json, derived from the supplied gym V1.00 ZIP. The source comparison allows only the documented filename, gym copy/default and Open Graph namespace substitutions.

PWA logos, icons and gym imagery are included locally. See docs/GYM-ASSETS.md. Third-party icon notices are retained in THIRD-PARTY-NOTICES.txt.

A configured database ID and a successful local build do not constitute a live Cloudflare deployment. Live publishing and provider configuration require the owning Cloudflare and provider accounts.
