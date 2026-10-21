# IronPulse Gym V1.04 — release verification

Verified 21 October 2026. Node 24.19.0, Wrangler 4.128.0, package 1.4.0.

## Results

| Check | Result |
| --- | --- |
| Current code/regression suites | 33 / 33 passed |
| Cloudflare Pages Functions/Worker build | Compiled successfully |
| Browser workflow groups | 16 / 16 passed; zero page errors |
| Fitness Tips workflows | 6 groups; desktop 1440px and mobile 390px |
| Fitness Tips stability samples | 9 samples; zero label/media mutations after test DOM changes |
| Navigation label samples | 526 stable frames, including 320/390/760/1440px cases |
| Actual local Worker + migrated D1 | 8 / 8 groups passed |
| Actual local Worker + initially empty D1 | 8 / 8 groups passed |
| Original V1.03 input paths | All 2,814 retained |
| Original V1.00 archived files | All 1,829 verified byte-for-byte |
| Active frontend/backend/migrations | 491 / 268 / 56 |
| CSS/theme files | All 177 byte-identical to V1.03 |
| Backend and migration files | All byte-identical to V1.03 |
| Existing action-function fingerprints | 21 retained byte-for-byte |
| Package | Complete source, file hashes, ZIP CRC and extracted-file verification |

## Root cause and fix

The new focused browser regression reproduces the screenshot's repeated s/Updates text using the unmodified attached V1.03 source. It waits beyond both delayed compatibility initializers, which earlier navigation-only checks did not exercise on this panel.

V1.04 removes the competing whole-panel text translators, makes image setup/preview idempotent and restricts its observer to relevant control/header changes. The old heading helper defers to the existing dynamic label API instead of emptying the Fitness Tips title. Source templates contain the corrected visible fitness examples; user-written titles and body text are not translated.

Only three frontend presentation scripts change behaviour. Twelve other scripts have copy-only replacements, and their JavaScript structures are verified against V1.03. Unmodified source fingerprints continue to be checked for every other frontend script. All backend code, DDL, API routes, account roles, migrations, CSS and colours remain compatible. The DB binding still selects 893e7d29-fa72-413d-9415-5d93b1c3bc6e. No migration is needed for this UI fix.

## Covered workflows

- Open Social Media → Fitness Tips through desktop navigation and the mobile menu.
- Run both delayed initializers, trigger unrelated DOM changes, filter posts, preserve stored titles and reload.
- Edit a draft, upload its image through the existing Google Drive endpoint, normalize hashtags and save the original draft payload fields/body.
- Apply a custom name containing Fitness Tips and verify the panel/menu stay stable.
- Retain one active Posts tab, public pages, Member/Coach routing, PWA assets, the plan editor and mobile payment help.
- Exercise cold configuration skeletons, renamed dictionary names, deduplicated refresh, invalid responses, bounded timeouts, Retry and Schedule late-response handling.
- Run a real local Cloudflare Worker against both migrated and empty temporary D1 instances, including Admin login/logout and private dashboard headers.

Mobile form-wizard counters may repaint as part of the retained component library. The focused test measures the affected labels and image preview rather than changing that unrelated behaviour.

## Evidence and limits

Machine results/logs are in verification/ironpulse-v1.04/. frontend-fixes.json records explicit source exceptions and protected functions; copy-only-edits.json lists exact visible phrase substitutions; v103-input-files.json identifies every input file; source-comparison.json lists current changed/added paths. The unmodified V1.00 archive and all prior V1.03 paths remain included.

Browser provider responses use synthetic fixtures. Runtime checks use temporary local D1 databases. Live payments, publishing, email and OAuth provider accounts were not exercised. Production deployment has not been performed by this local verification. Push the complete replacement to the existing GitHub branch and deploy it in the existing Cloudflare Pages project.

This environment reused the pinned dependency versions, available Chromium and a loopback-interface shim for the local Cloudflare runner. Dependencies, build output, temporary databases and browser screenshots are not included in the source ZIP.

## Reproduce

    npm ci
    npm test
    npm run check:complete
    npm run build
    npx playwright install chromium
    npm run test:gym:fitness-tips
    npm run test:gym:browser
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    node tools/verify-gym-package.mjs

After deployment, /release.json must report V1.04 and 1.4.0. Close older Admin tabs and use Ctrl+Shift+R once before checking Fitness Tips.
