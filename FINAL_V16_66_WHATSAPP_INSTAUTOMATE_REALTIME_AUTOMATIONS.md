# V16.66 — Instautomate WhatsApp + Realtime Instagram Automation Reliability

## Scope

This is an additive follow-up to V16.65. It does not redesign the website, admin theme, Inbox, Comments, payments, or Flow Builder UI. The changes are limited to social DM ingestion/sending, Instagram realtime subscription repair, and a small admin-side realtime safety check.

## WhatsApp / Instautomate root causes

The Instautomate webhook wrapper contains fields such as `message.whatsapp_message_id`, `message.is_new_message`, `message.status`, and the original `whatsapp_webhook_payload`.

V16.65 treated every `contact + message` wrapper as an inbound customer message. Status callbacks could therefore become blank Inbox bubbles. V16.65 also did not prefer `whatsapp_message_id`; when another ID was absent it generated a random local ID, so repeated status callbacks could be stored more than once.

A second independent issue prevented WhatsApp Flow Builder buttons from working through Instautomate. The generic WhatsApp text sender already supported Instautomate, but Flow Builder `Buttons / Quick Replies`, `List`, and template sending still required direct WhatsApp Cloud API credentials.

## V16.66 WhatsApp changes

- Uses `message.whatsapp_message_id` as the primary Instautomate message identity.
- Uses deterministic fallback IDs rather than random IDs when a provider message ID is unavailable.
- Treats explicit `is_new_message=false` events and events with `status` as provider status/echo callbacks, not customer messages.
- Requires real body/media content before a normalized Instautomate wrapper can become an Inbox message.
- When `whatsapp_webhook_payload` contains the original WhatsApp `messages[]` event, that original payload is authoritative and the normalized wrapper is not stored a second time.
- Automatically cleans legacy blank Instautomate status/echo rows previously stored by V16.65 while preserving genuine text/media messages.
- Instautomate Flow Builder button replies now use `/contact/send-interactive-message`.
- Instautomate list replies use the same provider interactive endpoint with list data.
- Instautomate template blocks use `/contact/send-template-message`.
- Instautomate media replies use `/contact/send-media-message`.
- If an Instautomate account accepts text sending but its interactive endpoint rejects a rich button/list message, the automation falls back to numbered text choices rather than silently stopping.
- Numeric interactive reply IDs (`1`, `2`, `3`, etc.) are understood by the existing Flow Builder session router.
- Outbound provider message IDs are retained when returned by the provider, which also strengthens duplicate/echo suppression.

Important operational rule: if the same WhatsApp number has an active chatbot in Instautomate and an active chatbot in Urgent Casting, both are independent automation engines and both can legitimately respond. V16.66 filters provider status/echo callbacks, but it does not silently disable an external chatbot. If Urgent Casting should own the automation for the number, keep the corresponding Instautomate chatbot disabled.

## Instagram latency root cause and repair

V16.65 made Instagram automation reliable through the Conversations API fallback, but the existing full Inbox fallback ran on an approximately 60-second browser interval. When Meta's realtime `messages` webhook was not reaching the callback, the automation could therefore appear 30–60 seconds late.

V16.66 strengthens the realtime path in two ways:

1. Instagram webhook configuration now establishes the core `messages` and `comments` fields first. Optional fields are added afterward one-by-one. An optional field rejection can no longer prevent the critical `messages` subscription from being repaired.
2. While an authenticated Admin page is open, a lightweight Instagram safety check runs every six seconds. It checks only a handful of very recent conversations/messages, skips message IDs already in D1 before fetching details, and routes a genuinely new inbound message through the same exactly-once automation claim used by webhooks.

The Meta webhook remains the primary path and is the path that works without an Admin browser open. The six-second safety check is only protection against temporary webhook delivery/subscription problems.

## Files changed

- `functions/_lib/utils.js`
- `functions/_lib/social-automations.js`
- `functions/_lib/social-dms.js`
- `functions/api/webhooks/whatsapp.js`
- `functions/api/admin/social-dms.js`
- `functions/api/admin/social-platform-action.js`
- `public/admin/index.html`
- Added `public/admin/final-v16-66-realtime-automation.js`

No V16.65 file was removed.
