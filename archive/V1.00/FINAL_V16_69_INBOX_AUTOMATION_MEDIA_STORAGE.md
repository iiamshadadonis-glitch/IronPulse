# V16.69 — Inbox Automation Toggle + Media Storage Clarification

## Inbox automation behavior
- The Inbox shows the Automation toggle only when at least one enabled DM flow exists for that conversation's platform (or an enabled `all` DM flow exists).
- When Automation is ON, manual text, emoji, attachment and Send controls are disabled.
- The message field says: `Disable Automation to send messages manually.`
- Turning Automation OFF puts only that participant/conversation into human mode and immediately enables manual sending.
- Turning Automation ON returns that participant to the active automation system.
- When a platform has no enabled DM flow, no Automation control is displayed and manual sending remains available.
- The server also enforces this rule so a manual send cannot bypass the disabled composer while Automation is ON.

## Incoming image storage model
- Inbox image bytes are **not persisted in Cloudflare D1**.
- Inbox image bytes are **not copied to R2** by the social Inbox implementation.
- D1 stores only message metadata/reference fields such as the provider message ID, attachment URL or media ID, MIME/type metadata and the message's normalized webhook JSON.
- When an admin opens an image, `/api/admin/social-dm-media` securely fetches/streams the media from Instautomate/Meta/other supported provider on demand.
- The returned image uses a short private browser cache (`max-age=300`). This is temporary browser caching, not permanent application storage.
- Because the website relies on the provider-side media reference, a provider can eventually expire/remove the original image. This design intentionally avoids growing Cloudflare persistent storage with every social-media attachment.
