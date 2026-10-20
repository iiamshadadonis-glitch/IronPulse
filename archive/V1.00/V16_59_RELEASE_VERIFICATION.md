# V16.59 Release Verification

Verification performed against the complete V16.58 replacement package after applying only the V16.59 Inbox additions/fixes.

## Passed checks

1. **JavaScript syntax:** 264 JavaScript files under `functions/` and `public/` were parsed with `node --check`; 0 failures.
2. **Relative module integrity:** 296 relative ES-module imports under `functions/` were resolved; 0 missing files.
3. **Exact DM storage test:** the actual exported V16.59 `upsertDmMessage()` function was run against a D1-style SQLite adapter:
   - first inbound message inserted;
   - duplicate platform/message ID safely ignored;
   - duplicate did not increment unread;
   - later unique messages inserted;
   - an older message synchronized later did not rewind the latest conversation preview;
   - `last_message_id` and `last_direction` identify the newest message correctly.
4. **Instagram webhook classification test:** the actual `ingestMetaDmWebhook()` function was run with an Instagram webhook object hint:
   - event stored as `instagram`;
   - replay of the same message ID ignored;
   - unread count remained 1.
5. **Incremental Instagram synchronization test:** the actual `refreshSocialDms()` function was run with mocked Meta responses:
   - only the recent conversation was synchronized;
   - the new DM was stored once;
   - a second refresh deduplicated it;
   - no old `messages.limit(30)` nested query was used;
   - participant name/username and unread state were retained.
6. **Conflict SQL semantics:** SQLite verified `INSERT ... ON CONFLICT(platform,external_message_id) DO NOTHING RETURNING ...` produces one row and no exception on a duplicate.
7. **Static release assertions:** new V16.59 CSS/JS are loaded after the existing Inbox assets; sync cursor, notification deep-link, paperclip, emoji picker, Instagram camera glyph, timeout, and atomic conflict handling markers are all present.
8. **Existing-file scope review:** compared with the uploaded V16.58 package. Existing files changed only where required for Inbox schema, Meta DM/webhook handling, shared notification routing/wording, and loading the additive V16.59 assets. No site/admin theme palette was replaced.

## Deployment database behavior

`functions/_lib/schema.js` creates the new `social_dm_sync_state` table automatically when schema initialization runs. Migration `0032_v16_59_inbox_reliability_notifications.sql` contains the same idempotent table creation for migration-based deployments. No existing DM tables or stored DM rows are dropped or reset.
