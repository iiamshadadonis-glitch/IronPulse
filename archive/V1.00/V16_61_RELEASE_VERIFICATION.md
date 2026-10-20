# V16.61 Release Verification

## Scope

V16.61 is an additive Inbox/Comments correction based on the supplied V16.60 package and the reported Facebook/Instagram screenshots. It does not redesign the admin or change the existing color theme.

## Verified corrections

- Inbox loader wrappers no longer form the V16.59 ↔ V16.60 recursive chain that caused `Maximum call stack size exceeded`.
- The older V16.59 background Inbox poll yields to V16.60+ so only the newer fast watcher owns realtime polling.
- Fresh `/api/admin/social-dms` rows are copied into the shared Inbox state, allowing the sidebar badge and per-platform unread counts to remain current outside the Inbox screen.
- Opening a conversation continues to call the existing `mark_read` action, so unread counts disappear only after that conversation is opened.
- Legacy Facebook duplicate conversation rows are merged by participant identity, preserving the real Meta thread ID and moving stored messages to it.
- Repeated Facebook message IDs remain atomic through `ON CONFLICT(platform, external_message_id) DO NOTHING`, preventing duplicate unread increments.
- Facebook Messenger `is_echo` events and Page-originated sender events are ignored before Inbox storage.
- Facebook sender names/profile images are resolved on a best-effort basis using the connected Page credential.
- Meta messaging events are no longer passed into the Social Comments messaging-ingest path.
- Existing synthetic Facebook DM rows in Comments are pruned, while genuine social comments remain.
- V16.61 unread badge CSS/JS assets are present in the admin entry page.

## Automated verification performed

1. **JavaScript syntax:** 266 first-party `.js` files parsed with `node --check`; 0 syntax errors.
2. **Relative ESM imports:** 296 detected relative ESM imports resolved; 0 missing targets.
3. **Admin local assets:** 138 local `src`/`href` references in `public/admin/index.html` resolved; 0 missing files.
4. **Targeted assertions:** 21 source-level assertions passed for loader recursion guards, legacy poll dormancy, persistent Inbox state, sidebar/platform unread badges, Facebook profile enrichment, echo filtering, conversation merge logic, message dedupe, DM-vs-Comments routing, legacy comment cleanup and V16.61 asset loading.
5. **Actual social-dms functional harness:** an in-memory SQLite/D1-compatible harness reproduced the V16.60 duplicate Facebook state (`Begumz Rasheed` + generic `Facebook`). V16.61 merged it to one real thread, moved its stored message, retained the proper participant name, and kept unread counts correct. A repeated message ID inserted once only.
6. **Actual Comments routing harness:** a legacy synthetic `Direct Message` row was deleted while genuine Facebook and Instagram comments remained. The legacy messaging-to-comments compatibility function returned false.
7. **Actual Meta webhook handler harness:** an inbound Facebook Messenger event plus an `is_echo` event were sent through the real `/api/webhooks/meta-leads` handler with a mocked Meta profile response. Exactly one inbound Inbox message was stored and the echo was ignored.
8. **Loader stack simulation:** the V16.59 → V16.60 → delayed V16.59 → delayed V16.60 installation order was simulated; the underlying loader executed once per requested load with no recursion.
9. **Credential safety:** no Meta access-token strings from the previously supplied n8n exports were copied into this package.

## Deployment boundary

These checks verify package integrity, routing logic and D1-compatible behavior locally. They do not claim a live production deployment or impersonate Meta's production webhook delivery. After deployment, the existing connected Meta webhook/API credentials remain responsible for live delivery.
