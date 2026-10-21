# V1.04 — Fitness Tips text and page stability

The supplied screenshots are reproduced by opening Social Media → Fitness Tips in V1.03 and allowing its delayed initializers to run. This is a client-side rendering defect.

## Cause

1. public/admin/gym-admin-v1-03.js translated the whole rendered Fitness Tips panel repeatedly, including plural-to-singular conversions.
2. public/admin/final-v16-54-brand-articles-stability.js matched Fitness Tip inside Fitness Tips, appended another s, and appended Updates even when it was already present. Its MutationObserver processed its own edits again.
3. The same image enhancement rebuilt its preview on every pass. On mobile, observing unrelated form-wizard changes added unnecessary work.
4. public/admin/final-menu-ads-ssl-polish.js cleared a dynamically owned panel title, including its empty placeholder span.

## Fix and scope

Remove the two broad text translators. Templates already contain gym wording, and the existing layout/dictionary store owns configurable names. Keep that ownership from first paint, including existing skeleton/error states.

Retain image upload, edit, reset and save wrappers. Cache the rendered image state, avoid unchanged attribute/class writes, observe only relevant inserted/removed controls and table headers, and disconnect the observer during its own enhancement pass.

Make the old panel-title helper defer to the existing dynamic label API. Update outdated visible examples in source templates rather than rewriting user content after rendering. Refresh only the changed Admin script URLs.

The full per-script source audit is frontend-fixes.json in verification/ironpulse-v1.04/. The copy-only scripts retain their JavaScript structures. The unmodified upload/save/edit/reset, routing and Posts tab functions are also fingerprinted there.

No backend, database migration, D1 binding, API protocol, CSS file or colour theme is changed. This update does not need a new database or a migration.

## Install

1. Extract V1.04.zip and copy every file and folder into the existing IronPulse GitHub repository, keeping its Git history.
2. Commit and push. Use GITHUB-SUMMARY.txt for the title and description.
3. Let the existing Cloudflare Pages project deploy that new commit. Keep the existing Cloudflare secrets and DB binding.
4. Check /release.json on the deployed gym website: version V1.04, package_version 1.4.0.
5. Close older Admin tabs, reopen Admin, and use Ctrl+Shift+R once. Open Social Media → Fitness Tips and check the labels, filters and form.

The ZIP is the complete project. All 2,814 paths supplied in V1.03 remain included; the archive stays outside the served application.

## Verification

The new browser regression is deliberately allowed to run beyond both delayed initializers (3.65 and 5.2 seconds). It reproduces the screenshot failure with unmodified V1.03 and exercises the fixed page on desktop and mobile. It also checks that customer-written titles/body, existing upload and draft payloads, custom names, reloads and Posts tab behaviour remain compatible. Synthetic API fixtures are used, without live provider calls.

Run npm test, npm run build, npm run test:gym:fitness-tips, npm run test:gym:browser, npm run test:gym:runtime and npm run test:gym:runtime:empty. Final results are recorded in RELEASE-VERIFICATION-GYM.md.
