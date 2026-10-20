# Urgent Casting V16.61 — Inbox Stability, Facebook Routing & Unread Badges

V16.61 is an additive correction to V16.60. Existing colors, theme, Posts, Payments, Orders, Comments actions, social connection settings and DM sending behavior are retained.

## Changes

- Fixes the Inbox `Maximum call stack size exceeded` error caused by V16.59 and V16.60 delayed loader wrappers wrapping each other. The V16.60 loader now uses a stable captured reference and the older V16.59 wrapper/poller yields to V16.60+.
- Keeps the Inbox sidebar unread badge persistent from D1/API `unread_count` even while the admin is viewing another module.
- Adds unread counts to **All Messages** and to each supported Inbox platform tab. Counts remain until the relevant conversation is opened and marked read.
- Keeps browser push notifications separate from the persistent Inbox unread badges.
- Repairs legacy Facebook duplicate conversations where the same person existed once under a Meta thread ID and once under a temporary `facebook:<sender-id>` webhook ID. Stored messages are moved to the retained conversation.
- Future Facebook/Instagram webhook placeholder IDs and Graph conversation IDs are unified by platform + participant identity, preventing the same customer from appearing twice.
- Facebook Messenger echoes are ignored when `message.is_echo` is true, and Page-originating messages are also ignored using the connected Page ID as a second safety check.
- Incoming Facebook Messenger users are enriched with the Messenger profile endpoint for name/profile image when available. The existing Inbox **View Profile** action is populated with a best-effort Facebook profile URL.
- Facebook/Instagram messaging webhook events are routed only to **Social Media → Inbox**. They are no longer inserted into the Comments database as synthetic `Direct Message` comments.
- Legacy synthetic DM rows previously written to Comments (`external_post_id = direct_message` or `external_comment_id` beginning with `dm:`) are removed when Comments data is loaded. Genuine Facebook/Instagram comments are untouched.
- V16.60 remains the single fast Inbox watcher; the redundant V16.59 polling loop goes dormant once the newer wrapper is installed.
- Notification service-worker registration cache key is bumped to V16.61.

## Facebook View Profile limitation

Messenger commonly identifies a customer by a Page-scoped user ID (PSID). The admin now exposes **View Profile** on Facebook conversations and enriches the contact name/avatar through Meta when permitted. Meta does not guarantee that every PSID resolves to a publicly viewable Facebook profile page, so the profile link is best-effort rather than a guaranteed public-profile lookup.
