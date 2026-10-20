# V16.57 — Inbox + Comments terminology + DM schema recovery

V16.57 is an additive update on the supplied V16.56 replacement.

## Changes
- Renames the visible Social Media `DMs` option and page title to `Inbox`.
- Adds comment-style capsule filters to Inbox: `All Messages` plus only enabled, connected messaging-capable platforms.
- Keeps the existing two-column message experience and adds platform identification on avatars/conversations.
- Adds WhatsApp to the unified Inbox when the configured WhatsApp provider is enabled and connected. Incoming WhatsApp messages are stored from the existing WhatsApp webhook; outgoing text uses the existing selected WhatsApp provider. Cloud API can also use image replies.
- Keeps unsupported voice/video call controls hidden.
- Removes `Audition` wording from the Comments workspace and uses `Article/Articles` instead.
- Fixes fresh/deployed databases that report `no such table: social_dm_conversations` by adding a self-healing DM schema guard and bumping the additive schema marker. No existing integration credentials are cleared.

## Compatibility
Existing article, post, comment, payment, integration, Google Drive, carousel and DM endpoint names/database data remain compatible. Internal legacy identifiers may keep their historical names; only user-visible wording is changed where requested.
