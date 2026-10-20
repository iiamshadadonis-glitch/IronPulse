# V16.71 Release Verification

## Scope
V16.71 is a targeted D1 free-tier read-efficiency update built directly from the complete V16.70 replacement. No existing application file was removed. The existing Admin visual theme and feature architecture are retained.

## Verification completed
- All JavaScript source files parsed with `node --check`: **283 files, 0 syntax errors**.
- Relative JavaScript module references checked: **316 references, 0 missing**.
- Local JavaScript/CSS references in `public/admin/index.html` checked: **145 references, 0 missing**.
- SQLite 3.46 / D1-compatible SQL smoke tests passed for:
  - V16.70-style DM table upgrade to `last_message_id` / `last_direction`;
  - new DM indexes;
  - newest-message metadata backfill;
  - bounded newest-message history ordering;
  - activity revision insert/increment/decrement behavior;
  - persistent auth schema marker UPSERT.
- Structural checks confirm:
  - the Inbox fast watcher calls `/api/admin/activity?scope=dm`;
  - comments watchers call `/api/admin/activity?scope=comments`;
  - the hot Inbox list no longer contains correlated latest-message subqueries;
  - D1 daily row-limit errors are not retried;
  - normal `sync=0` social-comment reads do not run cleanup/update maintenance writes;
  - changed Admin scripts are cache-busted to V16.71.

## Packaging verification
The final ZIP is separately tested with `unzip -t` after creation and extracted into a clean temporary directory for file-count/content comparison before delivery.

## Important boundary
These checks verify source integrity, JavaScript syntax, references, SQL compatibility and package integrity locally. They do not claim a live production deployment or live Meta/WhatsApp/Cloudflare account test from this build environment.
