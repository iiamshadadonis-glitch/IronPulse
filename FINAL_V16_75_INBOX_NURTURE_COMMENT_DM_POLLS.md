# V16.75 — Inbox Documents, Lead Nurturing, Comment-to-DM, Buttons and Polls

This release is additive. It preserves the existing Chatbot DM, Chatbot Comments, social publishing, scheduler, admin theme and color variables.

## Inbox documents without Cloudflare file storage

- Facebook Messenger, Instagram and WhatsApp inbound attachment metadata is retained in the existing Inbox rows.
- PDF/document bytes are never copied into D1 or R2. Binary/base64-like webhook fields are removed before raw metadata is written.
- The Inbox renders PDFs and other documents as clickable file cards.
- `/api/admin/social-dm-media?messageId=...` authenticates the admin, resolves the current provider URL or WhatsApp media ID, streams the provider response, and returns `Cache-Control`, `CDN-Cache-Control`, and `Cloudflare-CDN-Cache-Control: no-store`.
- PDFs open inline when the browser supports it; other files download with a safe filename. Expired provider media returns a clear unavailable response.

## New automation types

### Comment Triggers DM

Facebook and Instagram comments can match exact keywords, contained words, or starts-with triggers. A matching new comment sends the configured one-time private response. An event claim keyed by channel, platform and external comment ID prevents webhook/synchronization duplicates. The Live Auto-Reply switch pauses or enables the trigger.

### Lead Nurturing

New Enquiries from website forms, profiles, requests, checkout intake, WhatsApp, connected social DMs and lead webhooks are enrolled automatically. A flow supports:

- source filters or all sources;
- WhatsApp, email/Gmail and SMS steps;
- minute, hour or day delays after the previous step;
- `{{Name}}`, `{{FirstName}}`, `{{Phone}}`, `{{Email}}` and `{{Source}}` variables;
- an optional daily repeat of the final step;
- a paid/completed-order check before every delivery;
- delivery receipts, retries and an authenticated Run Due Now control.

The exact scheduler endpoint is `GET` or `POST /api/automation/lead-nurture`, protected by the existing automation API authentication. WhatsApp and email reuse the existing connections. SMS uses `SMS_RELAY_URL` and, when required, `SMS_RELAY_TOKEN`.

## Interactive DM messages

The flow builder keeps Buttons / Quick Replies and adds:

- Interactive Buttons;
- Image + Interactive Buttons;
- Reply / next-step action;
- Website or WhatsApp URL action;
- Call phone-number action.

Facebook/Instagram receive supported Meta button templates, WhatsApp receives native interactive reply buttons (with URL details retained in the message when URL buttons are not supported by that message type), and other providers retain a readable numbered fallback.

## Optional social polls

Poll data is available on text, image, carousel and video composer screens and on Articles. Native polls are sent only for currently supported API/formats: Threads text, X text and LinkedIn text. Selected platforms or formats that cannot receive the poll still publish the original post normally. Polls require a question, two to four options, and a duration. Options are capped at 25 characters for safe cross-platform delivery.

## Deployment

1. Deploy the complete replacement.
2. Apply `migrations/0035_v16_75_inbox_nurture_comment_dm_polls.sql` to the production D1 database.
3. Keep the existing automation scheduler and add `/api/automation/lead-nurture` at the desired precision (for example every 5–15 minutes).
4. Configure `SMS_RELAY_URL` only if SMS steps will be used.
5. Test each enabled provider with its real connected test account because providers enforce account permissions and messaging windows at delivery time.
