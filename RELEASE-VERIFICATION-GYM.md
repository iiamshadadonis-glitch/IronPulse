# IronPulse Gym V1.01 — release verification

Verified on 20 October 2026 with Node 24.19.0 and Wrangler 4.128.0.

## Configured destination

Pages project: **ironpulse-gym**. D1 binding: **DB**. Existing D1 UUID: **893e7d29-fa72-413d-9415-5d93b1c3bc6e**.

The old/incorrect database IDs are rejected by the deployment preflight. Setup resolves the real database name by this UUID in the authenticated account. It never creates a database or Pages project. Normal publishing uses the existing runtime schema initialization; the original migration history is retained for intentional fresh-database migrations.

## Results

| Check | Result |
| --- | --- |
| Current release and functional regression suites | 32/32 passed |
| Cloudflare Pages Functions/Worker build | Compiled successfully |
| Mobile/desktop browser workflows | 10/10 groups passed |
| Dynamic-label frame samples | 539; all expected labels stayed stable |
| Browser page errors | 0 |
| Real local Worker + migrated local D1 | 6/6 groups passed |
| Real local Worker + completely empty local D1 | 6/6 groups passed |
| Original migrations applied to a fresh local D1 | All 56 passed |
| CSS/theme comparisons | All 177 match after paths and comment copy are normalized |
| Backend/frontend source compatibility | All 268 backend and 236 frontend modules match after documented filename and text/default substitutions |
| Runtime schema and migration DDL | Preserved |
| Existing API file paths | All 183 preserved |
| JavaScript parsing | All 504 application scripts parsed |
| HTML inventories | 27 full pages checked for theme metadata, touch icons and assets |
| PWA icons | Standard and maskable 192/512px; Apple icon 180px checked |

The browser checks cover Member sign-up, Member/Coach dashboards, fitness specialties in the plan editor, placeholders, the payments/subscriptions full-screen modal and its Info helper, dictionary/cache first paint, renamed navigation, mobile submenu routing, delayed/malformed/failed configuration, Retry, and Schedule timeout/late-response behaviour at mobile and desktop widths.

The local Cloudflare checks exercise the actual compiled Functions with real temporary D1 storage, first-admin bootstrap with a unique password, authenticated settings/context and logout/session revocation. They use temporary databases and do not mutate the remote UUID.

The existing theme colours, account roles, schema/table/column names, JSON keys and business decisions remain compatible. Gym labels/default values and physical asset filenames were cleaned up. The 447 obsolete root documents/scripts and historical reports were excluded. Remaining technical schema/API names are explained in README.md.

## Live status

Cloudflare currently presents a sign-in screen in this session. **The remote database's account ownership/access and a production deployment have not been verified or performed.** This ZIP is configured for the supplied UUID and has passed the local checks above. START-HERE.md gives the exact Git-connected Pages settings and the two build-log lines that identify this replacement.

Live Razorpay/webhook and Google OAuth configuration require the gym's own provider credentials and deployed origin. No live charges, messages or provider OAuth requests were performed during verification.

## Reproduce

    npm ci
    npm test
    npm run build
    npx playwright install chromium
    npm run test:gym:browser
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    node tools/verify-gym-package.mjs

In this environment the pinned application dependencies were available from the existing local dependency cache; an offline reinstall was unable to fetch one uncached transitive package. No dependency installation cache or node_modules is included in the ZIP. The project lockfile is retained for a normal npm ci on Cloudflare.

This environment also required a test-only loopback network-interface shim for the local Cloudflare runner and the available Chromium executable for headless browser tests. Neither changes the shipped application or production network behaviour.

Machine-readable results and command logs are in verification/ironpulse-v1.01/. Browser screenshots were used only for local inspection and are excluded from this ZIP. FILES.sha256 checks the delivered source files; local configuration edits intentionally change those checksums.
