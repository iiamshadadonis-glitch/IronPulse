# V16.18 — Facebook DM, post cards, admin-response edit and notification routing

This release is additive to V16.17 and preserves the existing theme and unrelated workflows.

## Facebook one-time DM
- Admin wording now uses **Facebook one-time DM** instead of “comment private reply”.
- The initial comment-triggered DM keeps the documented comment-ID Send API flow.
- Typing indicators are **not** attempted before a Messenger conversation exists. Sender actions require a Messenger Page-scoped ID (PSID); a feed-comment author ID is not assumed to be a PSID.
- If Meta rejects a one-time DM with code 10903, the dashboard explains that this is a Meta commenter/activity restriction and recommends a public reply instead of presenting it as an authentication failure.
- The ordinary recipient-ID Messenger fallback remains limited to a verified recent inbound Messenger conversation.

## Facebook Post column
- Generic `Facebook post` rows are backfilled after sync from the existing successful Facebook publishing record.
- When necessary, the backend reads safe Graph Post fields: `message`, `created_time`, `permalink_url`, and `full_picture` (with a fallback that omits `full_picture`).
- Deprecated attachment aggregate fields are never requested.
- The displayed title/image/date therefore remain useful while the click target points to the real Facebook post.

## Admin response edit
- Facebook Page/admin responses now have an Edit action next to Delete.
- Editing updates only the saved Page reply object, not the visitor comment.
- Optimistic UI updates immediately and rolls back if Meta rejects the edit.

## Notifications
- Comments now use a visible toggle: **Enable Comment Notifications for this browser**.
- Turning the toggle off disables dashboard-generated comment notifications without pretending to revoke the browser's site permission.
- Notification payloads retain platform, status, and comment ID.
- Clicking a notification routes to Comments → matching platform → New (or All if the item has since changed status) → exact comment.
- Admin startup respects `?open=comments` so the Dashboard cannot overwrite the deep link during authentication/startup.
