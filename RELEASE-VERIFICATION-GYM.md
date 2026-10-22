# IronPulse Gym V1.07 verification

Verified against the complete user-supplied V1.06(1).zip, SHA256 `72508b7cc867579f49b566aeff8e760f61bca6b4b8560f0755037d02e43fbb0b`.

## Results

| Check | Result |
| --- | --- |
| Current release/regression suites | 36 passed |
| Actual Worker browser workflows | 30 groups passed: 6 Admin Fitness Tips, 8 public Fitness Tips, 5 branding/portals, 5 navigation/schedule, 6 Layout/theme |
| Real Chromium HTTP cache | 2 groups passed, mobile and desktop |
| Real local Worker/D1 | 11 migrated + 11 empty-database groups passed |
| Cloudflare Pages Functions build | Compiled successfully |
| Original complete V1.06 paths | All 2,992 retained |
| Original V1.00 archive | All 1,829 files match the preserved index |
| Existing stylesheets | All 179 match V1.06 byte-for-byte |
| Existing migrations | All 56 match V1.06 byte-for-byte |
| Core Admin functions outside saveSettings | All 81 match V1.06 source bytes |
| Active folders | 493 public/frontend files, 270 backend/delivery files, 56 migrations |
| API paths and runtime schema fingerprints | 183 paths and 270 schema sets retained |
| Asset manifest | All 415 CSS/JS sources fingerprinted; module URLs canonicalized |
| Complete ZIP | CRC, exact source bytes/file set, checksums and fresh extraction verified |

## Layout/theme coverage

- The exact supplied V1.06 Pages controller throws a RangeError under a router callback that re-enters Layout. The same callback enters the patched controller once, and importing it under another module URL preserves its singleton owner. The production screenshot contains no full stack trace; this is a targeted regression reproduction, not a claim to have observed that production call stack.
- Cyclic, deeply nested, oversized and unsafe-prototype layout objects are rejected safely. Shared acyclic references copy correctly. Incoming block definitions are rebuilt from the registry.
- Repeated Layout/Existing Pages transitions work without page errors. All four themes update available blocks and gallery uploader controls. Unpublished previews remain read-only and survive navigation.
- Mobile-only hiding preserves Desktop. Layout save cancellation/failure/retry, exact confirmation and existing revision/atomic-write guards pass.
- Theme save cancellation/failure/retry and API confirmation checks pass. Confirmation fields do not enter saved settings.
- An already open public page changes theme without navigation or hard refresh. Footer DOM, navigation links, social icons and Instautomate credit remain the same for all four themes at mobile and desktop widths.
- The theme confirmation is a mobile bottom sheet and centered desktop dialog. Existing CSS/theme bytes are unchanged.
- Earlier duplicate-image, public card layout, Admin editor, dynamic dictionary, request-budget, scheduling, authentication, payment and portal regression coverage is retained.

## Scope and evidence

This release changes seven frontend scripts and five backend/delivery files, listed with before/after hashes in `layout-theme-fixes.json`. The backend changes are the layout normalization helper, theme-save guard, canonical module URL helper, generated manifest and middleware release header. All other inherited application bytes match the supplied ZIP. `source-comparison.json` lists all changed/added paths and verifies that none were deleted; `FILES.sha256` covers the final package bytes.

The existing D1 binding `DB` retains ID `893e7d29-fa72-413d-9415-5d93b1c3bc6e`. No schema, table, API JSON key or stored role was renamed. No database migration is required.

Browser tests use synthetic records with real Worker-served HTML/scripts/styles. Local API tests use isolated temporary D1 databases and synthetic credentials. No live deployment, production database, gateway, Google account, or other external provider was changed or verified by these local checks. Deploy this complete replacement to apply it to the live site.

All current logs and JSON evidence are in `verification/ironpulse-v1.07/`. Older verification folders are retained as historical evidence for their respective versions.
