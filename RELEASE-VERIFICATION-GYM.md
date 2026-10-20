# IronPulse Gym V1.03 — release verification

Verified 20 October 2026 with Node 24.19.0 and Wrangler 4.128.0. Package version: 1.3.0.

## Current checks

| Check | Result |
| --- | --- |
| All original V1.00 files preserved | 1,829 / 1,829; every archived byte checked |
| Current application file inventory | All 815 expected files present |
| Frontend/backend/migrations | 491 / 268 / 56 |
| Current regression suites | 32 / 32 passed |
| Cloudflare Worker build | Compiled successfully |
| Browser workflows | 10 / 10 groups passed |
| Label samples | 458 stable frames; zero page errors |
| Real local Worker + migrated D1 | 8 / 8 groups passed |
| Real local Worker + empty D1 | 8 / 8 groups passed |
| Original migrations | All 56 applied successfully to fresh local D1 |
| Archived configuration isolation | Archive configuration was not returned through the app URL |
| Release identification | Actual local Worker serves V1.03 release.json |
| ZIP and file checks | CRC, byte comparisons, extraction and checksum verification |

## Original-source comparison

Both user-attached ZIPs were read directly. COMPARISON.md explains why V1.00 has 1,829 total files and V1.02 has 931, despite their different top-level item counts. FILE-COMPARISON.csv maps every original file and records its hashes and preserved location.

Every original frontend file (490), backend file (268) and migration (56) has a current mapped counterpart. The V1.00-to-current audit checks all 504 JavaScript application files and 177 CSS files against the documented filename, gym text/default and metadata substitutions. All 268 backend structures, 268 runtime schema fingerprints, 56 migration DDL sets and 183 API endpoint file paths match. There are no additional control-flow, theme-colour, schema or API-key changes.

The current production directories also match the attached V1.02 byte-for-byte for all 814 files other than the release.json version metadata. Membership, checkout, payment, schedules, CRM, authentication and portal logic are retained.

## Source preservation

All 1,829 original V1.00 files are stored byte-for-byte in archive/V1.00/. The 44 V1.02 verification records are also preserved separately in archive/V1.02-verification/. Additional archive README/ignore files clarify its purpose and keep release evidence available to source control.

The archive sits outside the live public/functions folders. The current root configuration is used for deployment. The real local Worker checks confirm that the old archived configuration is not exposed through its URL.

The original archive includes historical, version-specific tests and reports. They are retained as original source; the current npm test command runs all 32 current regression suites. Current browser and real local Worker/D1 checks were rerun for V1.03.

## Deployment configuration

Binding DB selects existing D1 UUID 893e7d29-fa72-413d-9415-5d93b1c3bc6e. Deployment validation rejects incorrect/old/placeholder IDs, confirms the current release and checks the complete source before compiling the Worker. Setup never creates another database. Read START-HERE.md and CLOUDFLARE-FIX.md for exact Pages settings.

The screenshot showed an older configuration being deployed. The corrected repository contents must be committed and pushed, then the new commit deployed. Remote account ownership/access and production publishing have not been verified in this signed-out session. Local verification does not make live payment, email or OAuth calls.

## Reproduce

    npm ci
    npm run check:complete
    npm test
    npm run build
    npx playwright install chromium
    npm run test:gym:browser
    npm run test:gym:runtime
    npm run test:gym:runtime:empty
    node tools/verify-gym-package.mjs

This environment used the pinned dependencies already available locally, the available Chromium executable and a test-only loopback interface shim for the local Cloudflare runner. Those environment accommodations do not alter the delivered application. Browser screenshots and temporary dependency/build/database state are excluded from the package.

Machine results and logs are in verification/ironpulse-v1.03/. FILES.sha256 verifies the delivered files before you make configuration edits.
