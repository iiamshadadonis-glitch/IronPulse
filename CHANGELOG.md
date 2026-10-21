# Changelog

## V1.06 — Worker Fitness Tips layout delivery and asset cache busting

- Correct the missing stylesheet on Cloudflare's generated /blog shell by appending the scoped card stylesheet after inherited/injected styles.
- Retain balanced desktop columns with 24px padding/gaps and use mobile full-width images with absolutely positioned text, dark gradients and primary-theme Read More buttons.
- Fingerprint all 415 CSS/JS sources during the build and version HTML references plus module imports with release/build/content hashes.
- Keep HTML uncached and make compatibility asset URLs revalidate; retain notification service worker behaviour.
- Add a custom-domain CSS purge helper and invoke it only after successful CLI deployment. Pages-managed pages.dev cache refresh remains deployment-controlled.
- Reproduce the V1.05 failure through the actual Worker route; add Worker browser and real warm-cache browser coverage.
- Preserve all 2,926 input paths, all inherited public JS/CSS bytes, all migrations and original business logic.

## V1.05 — Public Fitness Tips images and responsive cards

- Render each post's featured image once as its hero; filter matching body copies before inserting adverts.
- Match escaped/relative image URLs, wrapped images and supported Google Drive URL variants while preserving separate illustrations, captions and stored content.
- Balance desktop image/text columns with 24px padding and spacing.
- Add mobile full-width image cards with title, excerpt and Read More layered over a dark gradient.
- Keep Read More linked to the saved primary theme colour and retain light/dark mode compatibility.
- Refresh the public renderer URL and add one page-scoped stylesheet; preserve all 177 inherited CSS files.
- Add a public Fitness Tips regression suite and five-width browser coverage, retaining Admin and Cloudflare runtime checks.
- Retain all 2,869 V1.04 input paths, all 1,829 original archived files, all backend/migration files, API JSON keys and roles.

## V1.04 — Fitness Tips text and page stability

- Remove competing whole-panel text translators that appended extra s characters and repeated Updates.
- Make Fitness Tips image preview/setup idempotent; restrict its observer to relevant inserted/removed controls and table headers.
- Preserve the dynamic panel-title label instead of clearing its placeholder span.
- Correct obsolete fitness form examples and helper copy at their source.
- Refresh only changed Admin script URLs to bypass the previous browser cache.
- Add delayed-initialization desktop/mobile browser coverage for labels, custom names, filters, saved content, image upload, draft payloads and Posts tab selection.
- Preserve all 2,814 input paths, all 1,829 original archived files, all backend files, every migration and all CSS/theme bytes.


## V1.03 — Complete source preservation and renewed verification

- Preserve every one of the 1,829 original V1.00 files, without editing its bytes, under archive/V1.00/.
- Keep the full working gym application at the project root with every original frontend/backend/migration counterpart.
- Add COMPARISON.md and FILE-COMPARISON.csv explaining the top-level/recursive count difference and every file's status.
- Add a completeness check covering the original hashes and all 815 expected application paths; include it in the build.
- Add real local Worker checks for release identification and archived configuration isolation.
- Refresh package/release labels to V1.03 / 1.3.0 and rerun current checks.
- Preserve all existing business logic, colours, schema and API contracts.

## V1.02 — Complete gym release and Cloudflare deployment identification

- Package the full application and all assets/migrations, with a version-only ZIP name.
- Add GITHUB-SUMMARY.txt with a commit title and a detailed, copy-ready description of included fixes.
- Add PACKAGE-CONTENTS.txt listing every delivered file and its category.
- Add CLOUDFLARE-FIX.md with the diagnosis of the supplied publish error and exact Pages deployment steps.
- Add public/release.json and validate its release/package identity during the build preflight.
- Print the Cloudflare/GitHub commit identifier when available so the deployed source can be identified.
- Update release labels, package version and verification tools to V1.02 / 1.2.0.
- Keep all existing membership, payment, scheduling, CRM, authentication and other application logic.

## V1.01 — Existing gym database and remaining nomenclature cleanup

- Point the DB binding to existing D1 UUID 893e7d29-fa72-413d-9415-5d93b1c3bc6e.
- Reject the previous database, placeholder UUIDs and unexpected destinations before deployment.
- Resolve the actual database name by UUID in the signed-in account; stop safely if it cannot be found.
- Remove database/project creation from setup because the gym database already exists.
- Keep normal deployment on existing runtime schema initialization; retain explicit migration commands for intentional use.
- Rename physical frontend assets and the shared backend library for gym nomenclature while retaining compatibility API routes and original migration filenames.
- Add redirects for old asset URLs.
- Clean remaining visible helper copy, automation defaults/examples and document/export filenames.
- Correct Open Graph article namespace metadata.
- Remove 447 obsolete root documents/scripts and historical verification material.
- Preserve all 177 CSS/theme files after filename/comment normalization, all 183 API paths, backend/frontend source structure and schema definitions.
- Verify 32 release/regression suites, 10 browser workflow groups and 12 real local Worker/D1 runtime groups across empty and migrated databases.

## V1.00 — Initial IronPulse Gym fork

- Replace public-facing dance branding and Student terminology with IronPulse Gym and Member terminology.
- Use Gym Membership, Fitness Tips and Fitness Specialties in public pages, Admin, portals and defaults.
- Keep stored student/coach/admin roles, database identifiers and API JSON keys compatible.
- Move the public member portal to /member-dashboard and redirect previous dashboard paths.
- Retain dictionary/cache state ownership from first paint; use skeletons while configuration loads and recover with Retry after bounded failures.
- Preserve configuration refresh deduplication and Schedule timeout/late-response handling.
- Rebrand manifests, logos, favicons, standard/maskable PWA icons and Apple touch icons.
- Include local fitness photographs, thumbnails and a neutral gym avatar.
- Remove the shared Admin bootstrap password and require a configured unique secret.
- Preserve existing theme colours and business rules.

Technical names such as stored student roles, dance_styles_json and the compatibility /api/admin/dance-studio endpoint are intentionally retained. They remain internal contracts, rather than visible gym labels.
