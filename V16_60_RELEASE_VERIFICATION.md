# V16.60 Release Verification

## Scope

V16.60 is an additive follow-up to V16.59. It preserves the existing visual theme and existing Posts, Comments, Inbox storage, Payments, Orders and integration logic while correcting realtime Inbox/Comments behavior and the requested Inbox UI details.

## Verified changes

- Instagram Login DM synchronization and sending prefer `graph.instagram.com` when an Instagram Login token is available; the existing Page-token/Facebook Login path remains a fallback.
- Instagram webhook configuration independently requests comment fields and messaging fields according to the permissions actually available. A missing comment capability no longer prevents the DM subscription from being attempted.
- Instagram/Facebook Inbox capability data exposes whether the `messages` webhook field is currently known to be subscribed.
- The admin session performs a non-blocking realtime subscription check for connected Instagram/Facebook messaging and can invoke the existing webhook subscription action when the `messages` field is missing.
- Inbox opens from D1 first. Remote conversation synchronization runs afterward in the background and does not block the first render.
- Saved Inbox state is checked every 4 seconds for new inbound messages, unread-badge updates and the existing browser-notification mechanism.
- Visible Comments data and the Comments browser-notification watcher check stored data every 5 seconds.
- The first Comments platform label is `Articles`.
- Inbox notification control uses the same switch/toggle presentation and the same browser preference key as Comments.
- Emoji picker is a compact popover anchored below the message composer.
- Existing D1 duplicate-message protection remains atomic with `ON CONFLICT(platform, external_message_id) DO NOTHING`.

## Automated verification performed

1. **JavaScript syntax:** 265 first-party `.js` files parsed successfully with `node --check`.
2. **Relative module imports:** 296 relative ESM imports were resolved; 0 missing targets.
3. **Admin assets:** 134 local script/stylesheet references in `public/admin/index.html` were checked; 0 missing files.
4. **Targeted V16.60 assertions:** 15 source-level assertions passed for the Articles label, 5-second comment checks, 4-second Inbox check, background fallback, webhook subscription recovery, Instagram Login routing, notification toggle, compact emoji popover and V16.60 asset loading.
5. **D1 DM functional test:** an n8n/Meta-style Instagram `entry.messaging[].message` event and a Facebook Messenger event were inserted into an in-memory SQLite/D1-compatible harness. A repeated Instagram `mid` was ignored and did not increment unread count twice.
6. **Meta webhook endpoint functional test:** mocked Instagram and Facebook messaging webhook requests passed through the actual `/api/webhooks/meta-leads` handler. Both were classified into the correct Inbox platform and the Instagram live event recorded `messages` as delivered webhook evidence.
7. **Instagram comment webhook functional test:** a mocked Instagram `changes[].field = comments` payload using the same shape as the provided n8n workflow was accepted by the actual webhook handler when the normal API schema is present.
8. **Credential-copy safety scan:** the access-token strings visible in the supplied n8n exports are not present anywhere in this replacement package.

## Deployment note

The code can verify and request Meta webhook subscriptions, but a local package test cannot impersonate Meta's production webhook delivery to the user's live account. After deployment, the admin session automatically re-checks the connected Meta messaging subscription; the existing Integrations diagnostics remain available if Meta reports a missing permission or app-level approval.
