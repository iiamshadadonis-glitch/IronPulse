# IronPulse Gym V1.05 — release verification

Verified 21 October 2026. Node 24.19.0, Wrangler 4.128.0, package 1.5.0.

## Results

| Check | Result |
| --- | --- |
| Code/regression suites | 34 / 34 passed |
| Cloudflare Pages Functions/Worker build | Compiled successfully |
| Browser workflow groups | 24 / 24 passed; zero page errors |
| Public Fitness Tips workflows | 8 groups; 10 viewport/mode samples |
| Public screen widths | 320, 390, 760, 980 and 1440px; light and dark modes |
| Original duplicate reproduction | V1.04: one hero + one body cover; V1.05: one hero + zero body covers |
| Admin Fitness Tips regression | 6 groups; 9 stability samples |
| Navigation label samples | 541 stable frames |
| Actual local Worker + migrated D1 | 8 / 8 groups passed |
| Actual local Worker + initially empty D1 | 8 / 8 groups passed |
| Supplied V1.04 input paths | All 2,869 retained |
| Original V1.00 archived files | All 1,829 verified byte-for-byte |
| Active frontend/backend/migrations | 492 / 268 / 56 |
| Inherited CSS/theme files | All 177 byte-identical to V1.04; one new scoped stylesheet |
| Backend and migration files | All byte-identical to V1.04 |
| Existing public renderer functions | 30 retained byte-for-byte |
| Earlier protected Admin action functions | All 21 retained |
| Package | Complete source, file hashes, ZIP CRC and extracted-file verification |

## Root cause and changes

The existing backend-generated body can retain its leading cover image when its URL contains an escaped ampersand or different wrapper. The public page also adds its hero. The new browser fixture uses the actual content serializer/decorator and reproduces both images in unmodified V1.04 before confirming the fix.

One public renderer now filters matching cover copies from the detached, sanitized display body before adverts are inserted. Relative/escaped URLs, fragments, wrapped images and supported Google Drive URL variants are covered. Separate illustrations, captions, sponsored images, comments, share controls, stored content and the original post DTO remain intact.

One new stylesheet is restricted to public Fitness Tips list cards. Desktop cards have balanced image/text columns with 24px spacing and padding. At widths up to 760px, the image fills the card and the title, excerpt and Read More link sit over a dark gradient. Read More follows the saved primary theme colour; custom primary colours and both colour modes are checked. Existing theme declarations and inherited CSS files are unchanged.

The two public HTML files load the added stylesheet and a refreshed renderer URL. Existing /blog routes, configured slugs, filters, pagination, SEO metadata, APIs and business rules are retained. The existing DB binding still selects 893e7d29-fa72-413d-9415-5d93b1c3bc6e. No database migration is needed. All earlier V1.04 Admin fixes are included.

## Covered workflows

- Render one post hero; preserve separate images, captions, advertisements and threaded comment payloads.
- Handle nested picture/anchor covers, Drive variants, query-string distinctions, absent covers and the existing sanitizer.
- Check desktop column spacing, full-width mobile overlays, long text, primary-colour propagation, link clicks and horizontal overflow at five widths in light/dark mode.
- Retain page/tag query strings, pagination, empty/error states and missing-post behaviour.
- Retain Admin delayed initialization, image upload, edit/save payloads, custom labels, filters and Posts tab selection.
- Retain public branding, signup, Member/Coach routing, PWA, plan editing and mobile payment help.
- Exercise dictionary/cache skeletons, renamed labels, request deduplication, bounded errors/Retry and Schedule late-response handling.
- Run the real local Cloudflare Worker against migrated and empty temporary D1 instances, including login/logout and private dashboard headers.

## Evidence and scope

verification/ironpulse-v1.05/ contains the code-suite logs, browser result JSONs, runtime results, input inventory, baseline reproduction, source comparison and package audit. public-fitness-tips-fixes.json records the single renderer exception, new CSS and protected functions. The original compatibility baseline and earlier V1.04 verification remain included. PACKAGE-CONTENTS.txt lists every delivered file; FILES.sha256 verifies the complete package.

Browser API/provider responses use synthetic fixtures and runtime checks use temporary local D1 databases. Live payment, publishing, email and OAuth provider accounts were not exercised. Production deployment was not performed by these checks. Push the complete replacement to the existing GitHub branch and deploy the new commit in the existing Cloudflare Pages project.

This environment reused pinned dependencies, Chromium and a loopback-interface shim for the local Cloudflare runner. Dependencies, build output, temporary databases and browser screenshots are excluded from the source ZIP.

## Reproduce

    npm ci
    npm test
    npm run check:complete
    npm run build
    npx playwright install chromium
    npm run test:gym:public-fitness
    npm run test:gym:browser
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    node tools/verify-gym-package.mjs

After deployment, /release.json must report V1.05 and 1.5.0. Reload the public Fitness Tips pages with Ctrl+Shift+R once to fetch the new assets.
