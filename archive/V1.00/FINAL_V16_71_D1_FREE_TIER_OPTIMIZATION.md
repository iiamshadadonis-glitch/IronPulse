# V16.71 — D1 Free-Tier Row-Read Optimization

## Problem addressed
The Admin Inbox and Comments experience had accumulated several independent background refresh loops. The most expensive Inbox loop repeatedly loaded the full conversation list every four seconds, and that query also calculated latest-message fields with per-conversation subqueries. Comment notification/status loops also reloaded comment datasets even when nothing had changed. With the Admin page left open, those reads could accumulate into millions of D1 rows in a day even with only one administrator and very little public traffic.

Once Cloudflare has already rejected D1 queries because the account's daily row-read allowance is exhausted, deleting database rows does not restore that already-consumed daily allowance. V16.71 therefore focuses on preventing the repeated reads that caused the limit to be consumed.

## Additive fixes
- Added a tiny `admin_activity_state` change clock with one row each for Inbox DMs, comments and orders.
- The four-second Inbox watcher now reads the single DM activity row. The full conversation list is loaded only after the DM revision changes.
- Inbox conversation rows now store `last_message_id` and `last_direction` directly, removing two correlated latest-message subqueries from every list load.
- Added DM indexes for activity ordering, participant lookup and latest-message history.
- Conversation history is bounded to the newest 150 messages by default (maximum 300) rather than rereading an unlimited thread on every open/refresh.
- Meta and X synchronization batch-check known message IDs before requesting/storing message details. Duplicate webhook/API echoes return before touching the conversation row.
- The Instagram/Facebook realtime safety check no longer rewrites unchanged conversations just because it inspected them.
- Comment UI/notification loops now poll the one-row comments revision clock and reload comment datasets only after a real comment change.
- Ordinary `sync=0` comment reads no longer run cleanup/update maintenance writes.
- Admin browser authentication checks the indexed session cookie first instead of reading Google/integration settings on every Admin API request.
- Auth schema and DM schema bootstraps now use persistent one-row version markers, preventing repeated DDL/repair work in every new Worker isolate.
- D1 daily quota errors are explicitly non-retryable. Immediate retry loops cannot repair a quota error and only make the failure noisier.
- Background Orders refresh intervals were reduced while preserving visible-screen refresh behavior.
- Updated Admin asset query versions to `16.71` for the modified scripts so browsers do not continue running cached pre-fix polling logic.

## Preserved behavior
This is an additive performance/reliability update. Existing colors, visual theme, business logic, saved credentials, social connections, Inbox/Comments workflows, automation flows, payments, orders and stored D1 records are not intentionally reset or replaced.

## Deployment note
On an account that is already over its D1 daily allowance, the old deployment may continue receiving quota errors until Cloudflare makes D1 reads available again. Deploy V16.71 as soon as D1 requests are available; after deployment the Admin background watchers use the lightweight revision rows instead of repeatedly scanning Inbox/comment datasets.
