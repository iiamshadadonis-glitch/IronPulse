# V16.16 — Facebook Comment Actions + Notification Routing

Additive update on top of V16.15. Existing website, payment, CRM, publishing and color-theme logic remains intact.

## Facebook comments
- Facebook post detail lookup now requests only stable `id`, `created_time` and `permalink_url` fields, avoiding the deprecated attachment-aggregation warning that was not actionable by an admin.
- Post image/title continue to come from the already stored social publishing record, while the clickable post card uses Facebook's permalink when available.
- Added **Hidden** and **Spam** workflow views. Hiding moves the local row to Hidden only after Meta accepts and verifies `is_hidden=true`; Unhide verifies `is_hidden=false` and restores the row. Spam remotely hides and moves the row to Spam.
- Remote delete removes the Facebook comment first and then permanently removes the dashboard row.
- Added reply mode selection: nested reply to the specific visitor comment or a normal public comment on the Facebook post.
- Added delete-only-admin-response action so an incorrect Page reply can be removed without deleting the visitor comment.
- Added Facebook comment private reply through the comment `private_replies` edge. The button is available only when Meta reports `can_reply_privately=true` and the one-time private-reply window is still open.
- Messenger typing indicators are attempted when the Facebook private-reply modal opens, refreshed while the modal remains open, and stopped on Cancel or Send. Meta may reject the sender action before a Messenger conversation exists; typing-indicator failure never blocks the comment private reply.
- Echo/own-Page events remain excluded from the incoming inbox.

## Optimistic admin UI
Remote Like, Unlike, Hide, Unhide, Spam, Resolve, Reopen, Delete, Reply and Private Reply update the admin UI immediately. If the platform request fails, the previous UI state is restored and the error is shown.

## Layout
The five-column Comments table stays within the desktop card without a horizontal scrollbar. Status badges have a no-wrap width, and mobile remains a stacked layout.

## Notifications
Browser comment notifications now include platform/status/comment deep-link data. Clicking a Facebook notification opens Admin → Comments → Facebook → New and scrolls toward the referenced comment. The same routing pattern is used for other supported comment platforms and Audition article comments.

## Database
V16.16 adds only `social_comments.admin_reply_mode` and one visibility/status index. `ensureSchema()` still applies the change automatically on first run; migration `0029_v16_16_facebook_comment_actions_notifications.sql` is also included.
