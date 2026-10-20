# V16.67 — WhatsApp media, Inbox automation context, Human Takeover and AI automation

V16.67 is an additive update built on V16.66. It preserves the existing visual theme and existing social Inbox, Comments, publishing, payment, customer and integration behavior while extending the DM automation system.

## WhatsApp media in Inbox

- Instautomate wrapper media metadata is retained even when the forwarded original WhatsApp webhook is used as the authoritative inbound event.
- WhatsApp media ID, secure provider media URL and MIME type are preserved in the stored DM raw payload.
- The Admin Inbox uses an authenticated media proxy rather than exposing provider credentials to the browser.
- When a direct provider URL is no longer usable, WhatsApp Cloud media IDs can be resolved through the configured Cloud API token where available.
- Image messages render as image previews instead of blank bubbles.
- Clicking an Inbox image opens the image viewer. All image messages in the same conversation are available through previous/next navigation.

## Automation buttons / quick replies in Inbox

- Outbound automation button/list metadata is stored with the outbound Inbox message.
- The Inbox renders the choices beneath the automation response so the admin can see the same decision context that was presented to the customer.
- WhatsApp quick-reply buttons are limited to 3 with a 20-character label limit.
- Facebook and Instagram quick replies use their platform-aware limits in the builder.
- Limits are enforced both in the Flow Builder UI and again on the server before a flow is saved.

## Human Takeover / Resume Automation

- Each DM conversation has an automation control state: `automation` or `human`.
- The Inbox displays **Human Takeover** while automation owns an active conversation.
- Choosing Human Takeover pauses automated DM/AI responses for only that participant and allows the admin to reply manually.
- Choosing **Resume Automation** returns that participant to the automation engine.
- A Flow Builder Human Handoff block automatically places the participant into human mode.
- Manual composer controls are disabled while an active automation session owns the conversation, avoiding simultaneous human and automation replies.

## AI Integrations

A new **AI Integrations** category is available in Settings → Integrations before API Settings.

Built-in provider cards are supplied for:

- ChatGPT / OpenAI
- Google Gemini
- Claude / Anthropic

The admin can also create additional **Custom AI** integrations.

Each integration supports an API key, API URL, model, default system instructions and provider-specific/custom settings. The API key remains server-side; list responses expose only a masked indication that a key has been saved.

Each AI card includes the existing themed information `i` interaction and a back control for returning to the configuration form.

## AI Bot blocks in DM Flow Builder

- Only enabled and sufficiently configured AI integrations appear as Flow Builder content blocks.
- Each provider appears using its own saved name, for example **ChatGPT / OpenAI Bot** or **Google Gemini Bot**.
- AI Bot blocks are available only for DM automation, not Comment automation.
- A block can add its own step-specific instructions in addition to the integration-level system prompt.
- Recent conversation context and saved automation attributes are supplied to the AI request.
- The AI session remains at the AI block for subsequent customer messages until the automation ends or the admin uses Human Takeover.
- An AI fallback message can be configured if the provider request fails.

## D1 additions

Migration `0034_v16_67_ai_inbox_media_takeover.sql` adds:

- `ai_integrations`
- `social_automation_controls`

The runtime also safely ensures these additive tables exist before use.

## Files changed from V16.66

Existing files modified:

- `functions/_lib/social-automations.js`
- `functions/_lib/social-dms.js`
- `functions/api/admin/social-automations.js`
- `functions/api/admin/social-dms.js`
- `public/admin/final-v16-49-integrations-marquee.js`
- `public/admin/final-v16-56-posts-carousel-dms.js`
- `public/admin/final-v16-64-automation-flow-workspace.js`
- `public/admin/index.html`

New implementation files:

- `functions/_lib/ai-integrations.js`
- `functions/api/admin/ai-integrations.js`
- `functions/api/admin/social-dm-media.js`
- `migrations/0034_v16_67_ai_inbox_media_takeover.sql`
- `public/admin/final-v16-67-ai-integrations.css`
- `public/admin/final-v16-67-ai-integrations.js`
- `public/admin/final-v16-67-inbox-ai.css`
- `public/admin/final-v16-67-inbox-ai.js`

No V16.66 file was removed.
