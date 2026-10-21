# IronPulse Gym V1.06 — release verification

Verified 21 October 2026. Node 24.19.0, Wrangler 4.128.0, package 1.6.0.

## Results

| Check | Result |
| --- | --- |
| Code/regression suites | 35 / 35 passed |
| Cloudflare Pages Functions/Worker build | Compiled successfully |
| Actual local Worker browser workflows | 24 / 24 groups passed; zero page errors |
| Real Chromium warm-cache workflows | 2 / 2 groups passed; no request interception |
| Public Fitness Tips workflows | 8 groups; 10 viewport/mode samples |
| Public screen widths | 320, 390, 760, 980 and 1440px in light/dark modes |
| Admin Fitness Tips workflows | 6 groups; earlier label/upload/save fixes retained |
| Navigation label samples | 494 stable frames |
| Real local Worker + migrated D1 | 10 / 10 groups passed |
| Real local Worker + initially empty D1 | 10 / 10 groups passed |
| Build fingerprint coverage | All 415 CSS/JS assets; 9 literal module dependency URLs |
| Current asset build | f4e65a8978b36e976b7a |
| Supplied V1.05 input paths | All 2,926 retained |
| Original V1.00 archived files | All 1,829 verified byte-for-byte |
| Active frontend/backend-delivery/migrations | 493 / 270 / 56 |
| Inherited CSS/theme files | All 178 byte-identical to V1.05; one added scoped stylesheet |
| Inherited public JavaScript files | All byte-identical to V1.05 |
| Inherited backend files | 267 byte-identical; one audited middleware delivery addon |
| Schema, migrations and API paths | Existing definitions and all 183 API file paths retained |
| Package | Complete source, file hashes, ZIP CRC and extracted-file verification |

## Root cause and fix

Cloudflare's functions/blog/[[slug]].js generates a separate HTML shell for /blog and individual posts. V1.05 linked its card stylesheet only in the static public HTML files. The generated shell never requested it, so cache purging alone could not apply those layouts. The earlier static browser harness did not exercise this Worker route. V1.06's baseline reproduction confirms that the original generated shell omits the V1.05 card stylesheet; the original Worker browser test also fails waiting for the primary-colour Read More button.

The new delivery helper runs after existing middleware presentation injections. It appends the current card stylesheet last for a blog-list body, versions local stylesheet/script references and supplies versioned module imports. The build computes release/build/content hash query parameters for all CSS/JS files. Source filenames and all inherited public JS/CSS bytes remain intact.

Generated HTML is uncached even for requests without an HTML Accept header. CSS/JS responses revalidate and do not retain the old stale-while-revalidate policy. API-specific cache behaviour and notification service worker logic remain unchanged. The real local runtime checks verify the generated shell, new stylesheet, manifest-backed asset bytes and headers.

Desktop cards retain balanced columns with 24px spacing and padding. Mobile cards use full-width images with absolutely positioned text and a dark gradient. Read More follows the active primary theme colour. Long headline/excerpt fixtures fit, buttons remain clickable and the previous duplicate cover, adverts, comments, filters and pagination checks still pass.

## Cache regression and deployment

The dedicated cache test uses Chrome's actual HTTP cache with no Playwright routing. It first loads an old stylesheet with a one-hour lifetime, switches to the new deployment HTML and verifies that the fingerprinted URL fetches the corrected CSS. A force-cache read still retrieves the old CSS without a network request, proving that the fix bypasses rather than merely deletes that cache entry. A further reload verifies current CSS revalidation at 390px and 1440px.

For the present gym-fitness-3w8.pages.dev address, Pages manages deployment cache refresh. A customer-owned zone purge is not available for pages.dev. A custom-domain purge command is included and the CLI deployment helper calls it after a successful deployment, using environment-provided zone/token credentials. Its batching, URL scope, response validation and pages.dev handling are tested with synthetic API responses. Git-connected Pages deployments use their normal managed cache refresh; the custom-zone purge command is run after deployment when additional custom-domain caching is configured.

No live deployment or cache purge was performed in this verification session. Account credentials were unavailable. No remote database, payment or OAuth account was changed. Push the complete replacement to the existing gym repository and deploy the new commit with npm run build. docs/FITNESS-TIPS-DELIVERY-FIX.md contains the exact deployment and cache instructions.

## Preservation and evidence

asset-delivery-fixes.json records the narrow middleware exception, two new delivery files and scoped CSS. The source audit removes only the declared middleware additions and restores the exact original V1.05 bytes; all remaining inherited business backend files are verified byte-for-byte. Runtime DDL, migration DDL, stored roles, API JSON keys, all API paths and the gym D1 UUID 893e7d29-fa72-413d-9415-5d93b1c3bc6e are retained. No migration is needed.

The V1.05 renderer remains byte-identical, including its 30 protected functions and duplicate-cover fix. The V1.04 Admin fixes and all earlier verification records remain included. Every one of the 2,926 supplied V1.05 paths and all 1,829 original archived files is preserved.

Machine-readable results, logs, the input inventory, baseline reproduction, source comparison and package audit are under verification/ironpulse-v1.06/. PACKAGE-CONTENTS.txt lists every delivered path; FILES.sha256 checks package contents.

Browser provider/API responses use synthetic data. The page delivery, local Worker execution, temporary migrated/empty D1 databases and dedicated HTTP cache checks are real local executions. This environment reused pinned dependencies, Chromium and a loopback-interface shim for the Cloudflare runner. Dependencies, build output, temporary databases and browser screenshots are excluded from the source ZIP.

## Reproduce

    npm ci
    npm test
    npm run build
    npx playwright install chromium
    npm run test:gym:worker-browser
    npm run test:gym:cache-browser
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    npm run check:complete
    node tools/verify-gym-package.mjs

After deployment, /release.json must report V1.06 / 1.6.0. Use the Fitness Tips menu, /fitness-tips or /blog and check desktop/mobile cards. Keep Framework None, root directory blank, output public and Node 24 in the existing Pages project. The complete GitHub title/description is in GITHUB-SUMMARY.txt.
