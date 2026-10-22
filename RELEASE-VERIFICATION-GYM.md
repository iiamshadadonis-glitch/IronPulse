# IronPulse Gym V1.09 verification

This complete selective rollback was verified against all three attached ZIPs:

| Input | Files | SHA256 |
| --- | ---: | --- |
| V1.06(2).zip | 2,992 | 72508b7cc867579f49b566aeff8e760f61bca6b4b8560f0755037d02e43fbb0b |
| V1.07(2).zip | 3,059 | 4c90f41b26f38bdc09304921cfb76b4bf6c90618f4f4c5be74a468d3c66f91f0 |
| V1.08(1).zip | 3,127 | 3bf82b9baa955ccdd488ee7bb163c7e4bd9862c139cba396f851b353618d2064 |

## Results

| Check | Result |
| --- | --- |
| Current release/regression suites | 37 passed |
| Actual Worker browser workflows | 39 groups passed: 6 Admin Fitness Tips, 8 public Fitness Tips, 5 branding/portals, 5 navigation/schedule, 8 selective rollback, 7 Bulk Import |
| V1.06 public appearance comparisons | All 4 themes at 390px and 1440px match computed colours, typography, spacing and section dimensions |
| Real Chromium HTTP cache | 2 groups passed, mobile and desktop |
| Real local Worker/D1 | 12 migrated + 12 initially empty groups passed |
| Cloudflare Pages Functions build | Compiled successfully |
| Complete supplied source paths | All 3,127 V1.08 paths retained, including every earlier input path |
| Original V1.00 archive | All 1,829 files match the original index |
| Exact V1.06 architecture restorations | 6 files |
| Exact V1.08 Bulk Import scripts | All 3 retained |
| V1.06 application comparison | 809 of 819 files exact; 10 explicit exceptions |
| Existing stylesheets/colours | All 179 CSS files match V1.06, V1.07 and V1.08 byte-for-byte |
| Existing migrations | All 56 unchanged |
| CSV parser/import API | Unchanged |
| Protected functions in selective files | All 105 match V1.06 source bytes |
| Protected functions in Bulk Import scripts | All 89 retain original source bytes |
| Active folders | 493 public/frontend files, 270 backend/delivery files, 56 migrations |
| API paths | All 183 retained |
| Asset manifest | All 415 CSS/JS sources fingerprinted with V1.09 versions |
| Complete ZIP | CRC, exact file set/source bytes, checksums and fresh extraction verified |

## Rollback and retained-fix coverage

- The layout registry, Layout editor, Pages workspace, navigation compatibility helper, backend layout helper and asset-delivery implementation match the supplied V1.06 bytes exactly. Its original footer editing behaviour is restored.
- The V1.06 public renderer retains its original theme/model/style application. Only the protected Instautomate attribution and safe outbound link remain from the V1.07 changes.
- The original V1.06 settings save order is verified by restoring one request expression and comparing the entire file hash. All named appearance/colour/Banners functions retain their original bytes. The new theme warning is isolated from that flow.
- Public pages served by the actual local Worker are compared with pages from the actual supplied V1.06 code for all four themes on mobile and desktop. Colours, typography, spacing and section dimensions match.
- Desktop and mobile theme publication require exactly confirm. Wrong case remains disabled; cancellation sends no request; API failure shows retryable feedback. Confirmation fields are transient. The API also rejects missing/wrong confirmation and stale expected-theme confirmation.
- The exact original V1.06 Layout confirmation remains. Edit, cancel, wrong-case input, failed save and retry pass. The mobile warning remains a bottom sheet and the desktop warning remains centered.
- Recommended colour previews apply immediately. A colour-only save sends no theme confirmation and retains local settings assignment before the held API request completes. The next public load receives the saved custom palette.
- Unsaved theme choices do not inject the V1.07 theme-preview model into Layout. The original V1.06 theme and Banners behaviour remains.
- The Instautomate label, URL, target and rel attributes are checked at mobile and desktop widths without reinstating V1.07 footer immutability.
- All V1.08 Bulk Import browser checks pass again: routing/loader re-entry, required file validation, native picker, repeated rendering, recursive label callbacks, drag boundary transitions, callback replay, disabled/unsupported drops, real creates/updates, CSV and row errors, retry, concurrent-submit guard and the mobile wizard.
- Earlier Fitness Tips, branding/portals, dynamic names, request budgets, scheduling, authentication, payments, notifications and API/schema compatibility checks remain included in the current suite.

## Scope and evidence

The 10 differences from the 819-file V1.06 application comprise the three exact V1.08 Bulk Import scripts, four isolated confirmation/attribution files, the generated manifest, the middleware release header and public/release.json. Every other V1.06 application byte remains unchanged. The source audit checks the complete input, rather than a selected subset.

The D1 binding remains DB with ID `893e7d29-fa72-413d-9415-5d93b1c3bc6e`. Existing settings/content are retained. No table, column, API JSON key or stored role changes. No migration is required.

`selective-rollback-fixes.json` gives exact restoration/exception hashes. `v106-application-comparison.json` lists all application exceptions relative to V1.06. The three input indexes identify every supplied path. `source-comparison.json` and `.csv` list every changed or added file relative to the supplied V1.08 and verify no deletions. `PACKAGE-CONTENTS.txt` is the final inventory; `FILES.sha256` covers the final package except its own manifest.

Browser fixtures use synthetic data with real Worker-served HTML/scripts/styles. Local API checks use isolated temporary D1 databases and synthetic credentials. No production deployment/database, live payment gateway or provider account is changed by these local checks. Deploy the full replacement to apply it; START-HERE.md and docs/SELECTIVE-ROLLBACK.md contain the steps.

Historical V1.07 engine-specific tests and documents remain as records of that release. The current npm test replaces that superseded engine suite with gym-selective-rollback.mjs; all 37 current suites pass. Earlier verification folders describe their respective historical versions. Current logs and evidence are in verification/ironpulse-v1.09/.

## ZIP delivery repair

The earlier saved downloadable ZIP was 14,673,488 bytes instead of the verified local archive's 16,839,680 bytes. Its central directory and end record were absent. The complete application files were recovered with valid per-entry CRCs and checked against the original V1.09 FILES.sha256. All 819 application files remain byte-identical. Earlier verification files were restored from the complete V1.08/V1.07 sources, and current evidence was regenerated by rerunning the full checks above.

The replacement preserves every original V1.09 path. It uses conventional ZIP v2.0 Deflate/DOS metadata, no encryption or ZIP64, and atomic file finalization. Both Python and the independent unzip utility check the final archive, including full extraction and every-file checksums. Delivery requires a fresh materialization of the saved copy and exact comparison with the completed local ZIP before providing its link. The application remains V1.09/package 1.9.0; no code or database migration is involved.
