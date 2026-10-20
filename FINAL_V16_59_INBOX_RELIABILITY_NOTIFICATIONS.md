# V16.59 — Inbox Reliability + DM Notifications

This release is an additive update on top of V16.58. Existing Posts, Comments, publishing, payment, admin theme, and connected-integration settings remain in place.

## What changed

- **Duplicate D1 message writes are now safe.** Social DM inserts use one atomic `ON CONFLICT(platform, external_message_id) DO NOTHING` operation. A webhook and a manual/background refresh can therefore receive the same Meta message at the same time without producing the previous raw `UNIQUE constraint failed` admin warning or incrementing unread twice.
- **Conversation previews no longer rewind.** If an older message arrives later during synchronization, it is stored without replacing a newer conversation preview/time.
- **Instagram/Facebook refresh is lightweight and incremental.** The old large nested conversation+30-message request was removed. The first V16.59 sync uses only a short recent safety window (2 hours), then each refresh continues from a stored sync cursor with a 5-minute overlap for safe deduplication. Existing stored Inbox history is preserved; full historical Instagram history is not imported.
- **Remote sync cannot leave the UI waiting forever.** Social-network requests have a 12-second timeout and admin-facing failures are translated into plain-language guidance.
- **Meta webhooks classify Instagram message events explicitly.** The webhook handler now passes Meta's `object` type into DM ingestion so an Instagram messaging event is not accidentally treated as Facebook.
- **Instagram webhook subscription supports both login surfaces.** The existing Facebook Login/Page-token route is preserved, and the Instagram Login route is used when an Instagram Login token exists.
- **DM browser notifications use the same opt-in preference as Comments.** New inbound supported social DMs can trigger a browser notification. Clicking it opens `/admin/?open=inbox`, selects the platform, and opens the exact saved conversation.
- **Inbox keeps itself current while the admin page is open.** It checks stored webhook-delivered messages regularly and performs a lightweight API synchronization fallback periodically. Inbox unread badges update even if Inbox is not the active tab.
- **The stuck “Synchronizing supported social inboxes…” message is cleared.** A completed refresh briefly shows an “Inbox is up to date” message instead of leaving the loading notice on screen.
- **Instagram identity is clearer.** Instagram tabs/avatar platform dots use a camera glyph and Facebook identifiers are larger, without changing the existing theme.
- **Emoji controls are cleaner.** The old fixed 9-emoji row remains hidden until the emoji button is clicked and has been replaced with a broad category-based picker covering smileys, people, nature, food, activities, travel, objects, symbols, and flags.
- **Attachment control is recognizable.** The image attachment button now uses a paperclip icon while preserving the existing image upload/sending logic.

## Important behavior

V16.59 intentionally does **not** bulk-import the full Instagram inbox. Existing D1 messages remain untouched. On first use after deployment, the recent safety window is used to catch messages sent shortly before deployment; later refreshes are incremental only.

The browser notification behavior intentionally matches the existing Comments notification design and uses the same `uc_admin_notifications_enabled` preference and service worker.

## Files changed/added

Backend:
- `functions/_lib/social-dms.js`
- `functions/_lib/schema.js`
- `functions/api/webhooks/meta-leads.js`
- `functions/api/admin/social-platform-action.js`
- `migrations/0032_v16_59_inbox_reliability_notifications.sql`

Admin/browser:
- `public/admin/final-v16-59-inbox-reliability-notifications.js`
- `public/admin/final-v16-59-inbox-reliability-notifications.css`
- `public/admin/final-v16-12-social-diagnostics-notifications.js` (notification wording + service-worker version only)
- `public/uc-notifications-sw.js`
- `public/admin/index.html`
