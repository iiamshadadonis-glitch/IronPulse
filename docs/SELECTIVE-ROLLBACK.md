# V1.09: V1.06 appearance with the selected fixes

The three supplied ZIPs were compared directly. This complete release uses V1.06 as the application baseline, keeps every V1.08 Bulk Import safeguard, and retains only typed publication confirmation and the protected Instautomate credit from V1.07.

## What this release does

| Area | V1.09 behaviour |
| --- | --- |
| Public layout and theme registry | V1.06 implementation, without V1.07 payload normalization or new preview synchronization |
| Layout editor | Exact V1.06 editor, including its existing typed confirm dialog |
| Pages workspace/navigation | Exact V1.06 implementations |
| Website Colors and Brand Settings | V1.06 save order, immediate recommended-colour previews and original local settings assignment |
| Banners/gallery controls | Original V1.06 behaviour; no V1.07 registry/preview coupling |
| Theme publication | Exact typed confirm required before submitting a changed frontend theme |
| Footer | Website designed by Instautomate; Instautomate links to https://instautomate.com with target _blank and rel noopener noreferrer |
| Footer editing | Original V1.06 editing behaviour restored; V1.07's immutable-footer architecture is removed |
| Bulk Import | All three V1.08 safeguard scripts retained byte-for-byte |
| CSS/palettes | All 179 inherited CSS files remain byte-for-byte unchanged |
| Asset delivery | Original V1.06 delivery logic with newly generated V1.09 fingerprints |
| Database/import API | Existing schema, API keys, importer and D1 binding retained |

V1.06 already has its own theme choices, supported blocks and gallery behaviour. Those original features remain. This rollback removes the additional V1.07 synchronization and preview architecture rather than deleting V1.06 functionality.

## Narrow additions to the V1.06 baseline

The three exact V1.08 scripts are:

- public/assets/gym-ui-components-v1-49.js
- public/admin/gym-admin-v1-13.js
- public/admin/final-v16-84-inbox-telegram-sales.js

They preserve bounded upload rendering/drop callbacks, drag-state transitions, native file selection, the mobile import wizard and one Sales selection owner. CSV parsing, SKU updates, row validation and the backend importer are unchanged.

The isolated confirmation/credit changes are:

- public/admin/gym-admin-v1-29.js: add the responsive typed-theme confirmation to the original appearance controller. All original named colour, theme and Banners functions retain V1.06 source bytes. A failed theme publication releases its dialog for retry.
- public/admin/admin.js: pass transient confirmation fields in the existing settings request. Restoring that single request expression reproduces the complete original V1.06 file, including its save order.
- functions/api/admin/settings.js: retain the V1.07 exact-confirmation and stale-confirmation guards. They do not run for colour-only saves, and confirmation fields are excluded from stored settings. The original cache purge/invalidation remains unchanged.
- public/assets/gym-layout-v1-57.js: protect only the agency attribution from dynamic navigation-name replacement and enforce its safe label/link. The original layout model, style application, theme handling and footer controls remain.

The generated asset manifest and middleware release header identify V1.09. No stylesheet, theme palette, migration, payment flow, membership rule, stored role or API path is changed.

## Source and test evidence

verification/ironpulse-v1.09/ contains hashes for all three supplied ZIPs, the selective application audit, exact V1.06 restoration checks, exact V1.08 script checks, protected-function checks and current test results. RELEASE-VERIFICATION-GYM.md records final test counts.

The browser verification captures the actual V1.06 public pages and compares their computed colours, typography, spacing and section dimensions against V1.09 for all four themes at desktop and mobile widths. It separately tests theme/Layout confirmation, cancellation, errors/retries, original settings-save order, colour-only saves, agency links and responsive dialogs. Earlier Fitness Tips, navigation/scheduling, portals, authentication, imports and cache checks remain part of current verification.

Existing D1 settings are preserved. Replacing code restores V1.06 rendering behaviour while retaining the theme, colours, content and layout values you have saved in D1. This release does not overwrite those records with defaults or recreate the database.

## Deploy this complete replacement

1. Extract V1.09.zip. Copy every project file/folder into the existing gym repository root, retaining its Git history. Keep public/, functions/, migrations/ and archive/ together.
2. Keep the existing Pages project serving https://gym-fitness-3w8.pages.dev and its secrets. Match name and SITE_URL in wrangler.jsonc to that existing project when needed; retain DB and database ID 893e7d29-fa72-413d-9415-5d93b1c3bc6e.
3. Commit and push the new complete source. GITHUB-SUMMARY.txt supplies the title and full description.
4. Pages build command: npm run build. Output directory: public. Node: 24. Deploy this new commit.
5. Open /release.json and confirm version V1.09, package_version 1.9.0. Reload any already open Admin/public tabs once to load the newly fingerprinted scripts.
6. In Brand Settings, check your intended theme and colours. Theme publication requires typing confirm. A colour-only save uses the normal V1.06 flow. Layout saves still require typing confirm.
7. Check the public website on desktop/mobile, the Instautomate credit, and Sales → Bulk Import filename feedback. Import only records you intend to create or update; matching SKUs retain their existing update behaviour.

No database migration, credential reset, database recreation or provider reconfiguration is required. All original V1.00 archived files and all supplied V1.08 paths remain included.
