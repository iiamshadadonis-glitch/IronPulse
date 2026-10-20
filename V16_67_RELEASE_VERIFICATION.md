# V16.67 Release Verification

Verification was completed against the V16.67 working tree and repeated against a clean extraction of the final replacement ZIP.

## Package/static checks

- All JavaScript files pass `node --check`.
- All relative JavaScript imports resolve.
- All local Admin `src` / `href` references in `public/admin/index.html` resolve to existing files.
- No existing V16.66 file is removed.
- The V16.67 D1 migration parses and applies successfully in SQLite-compatible verification.
- 35 targeted V16.67 implementation assertions pass.
- Final ZIP integrity is checked with `unzip -t`.
- The final ZIP is extracted to a clean directory and the JavaScript/import/Admin-reference checks are repeated against that extraction.

## Targeted V16.67 checks

- Instautomate wrapper media URL is retained when a nested WhatsApp webhook is authoritative.
- WhatsApp media ID and MIME type are retained.
- Admin media proxy requires an authenticated admin request.
- Media proxy supports same-conversation image gallery discovery.
- Direct provider media and WhatsApp Cloud media-ID fallback paths are present.
- Inbox renders WhatsApp image media through the authenticated media route.
- Image viewer has previous/next navigation for conversations containing multiple images.
- Outbound automation interactive metadata is persisted with Inbox messages.
- Inbox renders sent buttons/quick replies below the related outbound automation message.
- WhatsApp buttons are limited to 3 and 20 characters in the UI.
- The same WhatsApp button/label limits are validated again on the server.
- Per-conversation Human Takeover state is persisted.
- Human mode prevents automation execution for that participant.
- Human Handoff changes the participant to human mode.
- Inbox provides Human Takeover and Resume Automation actions.
- Manual composer is disabled while a live automation session owns the conversation.
- Built-in ChatGPT/OpenAI, Gemini and Claude/Anthropic AI configurations exist.
- Custom AI integrations are supported.
- Stored AI API keys are not returned by normal integration list responses.
- AI integration Admin endpoints require Admin authentication.
- Enabled AI providers become individually named AI Bot blocks in DM Flow Builder.
- AI sessions continue on later customer messages until handoff/end.
- Recent DM history is supplied to the AI execution path.
- AI Integrations is added before API Settings in the integration workspace.
- V16.67 Admin JS/CSS assets are present in the Admin page.
- The new D1 migration contains both AI integration and automation-control tables.
