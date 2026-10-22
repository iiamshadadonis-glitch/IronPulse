# IronPulse Gym V1.08 verification

Verified against the complete supplied V1.07(1).zip, SHA256 `4c90f41b26f38bdc09304921cfb76b4bf6c90618f4f4c5be74a468d3c66f91f0`.

## Results

| Check | Result |
| --- | --- |
| Current release/regression suites | 37 passed |
| Actual Worker browser workflows | 37 groups passed: 6 Admin Fitness Tips, 8 public Fitness Tips, 5 branding/portals, 5 navigation/schedule, 6 Layout/theme, 7 Bulk Import |
| Real Chromium HTTP cache | 2 groups passed, mobile and desktop |
| Real local Worker/D1 | 12 migrated + 12 empty-database groups passed |
| Cloudflare Pages Functions build | Compiled successfully |
| Complete V1.07 input | All 3,059 paths retained |
| Original V1.00 archive | All 1,829 files match the preserved index |
| Existing stylesheets and colours | All 179 CSS files match V1.07 byte-for-byte |
| Existing migrations | All 56 match V1.07 byte-for-byte |
| CSV parser and importer API | Byte-identical to V1.07 |
| Unrelated functions in the three affected frontend scripts | All 89 match V1.07 source bytes |
| Active folders | 493 public/frontend files, 270 backend/delivery files, 56 migrations |
| API paths | All 183 retained |
| Asset manifest | All 415 CSS/JS sources fingerprinted; module URLs retain canonical versions |
| Complete ZIP | CRC, exact source bytes/file set, checksums and fresh extraction verified |

## Bulk Import coverage

- A controlled browser replay using the exact original V1.07 uploader reproduces Maximum call stack size exceeded when a change callback dispatches another drop. The patched handler processes one input/change pair. Baseline evidence is in baseline-reentry-results.json. The production screenshot contains no full JavaScript stack trace, so this is targeted regression evidence rather than a claim to have observed the production call stack.
- The original Sales selection and recursive upload-label callbacks also reproduce unbounded synchronous re-entry in regression fixtures. The patched callbacks stop at the active selection/render guard and release their guards after failures.
- The two live Sales controllers use one selection owner. Same-pane loader/router re-entry runs once, repeated navigation leaves one input/upload zone, and unchanged active/hidden states avoid redundant writes.
- The native picker, 100 repeated upload renders, a recursive label getter and cyclic metadata pass without cloning File objects or DOM events.
- Two hundred dragover events cause only the entry/exit class changes. Child transitions, drag end and drop state reset safely. Unsupported and disabled drops preserve the current selection. Multiple dropped files respect the original single-file input.
- The browser parses the real sample CSV and calls the unchanged importer against a temporary SQLite-backed D1 adapter. It creates two records, updates matching SKUs, preserves string-only request rows and displays row-level validation errors without leaving invalid records.
- Duplicate headers, incomplete quoted CSV and over-limit files fail before requests. HTTP failure permits retry; two concurrent import calls still produce one request through the existing import guard.
- The mobile native picker, required validation, review and Finish actions work. Repeated desktop/mobile transitions preserve the FileList, one upload zone and the active primary colour.
- Authenticated HTTP requests through the actual local Worker create and update the sample subscription and one-time draft records on both migrated and initially empty D1 databases.
- Earlier authentication, payments, portals, dynamic labels, scheduling, Layout/theme confirmation, independent viewport visibility, live public synchronization, immutable footer and Fitness Tips/cache tests remain included and pass.

## Scope and evidence

The application audit permits three frontend scripts plus two backend/delivery metadata files: the generated asset manifest and middleware release header. The latter is verified against the supplied middleware after restoring only 1.8.0 to 1.7.0. Every other inherited application byte remains unchanged. No import endpoint, data schema or colour declaration changes.

The D1 binding remains DB with ID `893e7d29-fa72-413d-9415-5d93b1c3bc6e`. No table, column, API JSON key or stored role was renamed. No migration is required. Existing payment, membership and integration implementations remain intact.

`bulk-import-fixes.json` contains explicit before/after hashes. `v107-input-files.json` records all supplied paths and hashes. `source-comparison.json` and `.csv` list every changed or added path and verify no deletions. `PACKAGE-CONTENTS.txt` gives the final recursive inventory; `FILES.sha256` covers the final package bytes except its own manifest.

Browser tests use synthetic records and the real Worker-served HTML, scripts and styles. API tests use isolated temporary D1 databases and synthetic credentials. These checks do not publish the production website or contact live payment, Google or other provider accounts. Deploy the complete replacement to apply it to the live website; START-HERE.md and docs/BULK-IMPORT-FIX.md explain the steps.

All current logs and JSON evidence are in verification/ironpulse-v1.08/. Earlier verification folders are retained as historical evidence for their versions.
