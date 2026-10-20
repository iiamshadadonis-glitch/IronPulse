# V16.68 — AI Integration cards and per-flow AI configuration

V16.68 is an additive follow-up to V16.67. It keeps the existing website theme and unrelated integrations/Inbox/Comments/payment logic unchanged while aligning AI Integrations with the rest of the Integrations workspace and moving campaign-specific AI behavior into the Automation Flow Builder.

## AI Integrations UI

- ChatGPT / OpenAI, Google Gemini and Claude / Anthropic now use the same compact `details` card language as the existing Social Media integrations.
- Cards are collapsed by default and open with the existing dropdown chevron.
- Each summary shows a themed status badge: Connected, Saved · test required, Needs attention or Disconnected.
- Each open card uses the existing themed information control and circular back control supplied by the shared admin guidance system.
- Help content is provider-specific, step-by-step and solution-oriented.
- The current Brand Name from `site_settings.siteName` is inserted into the help text dynamically. If the brand changes later, the AI setup instructions follow that brand automatically.
- Built-in provider cards no longer contain a global/default model or global/default system instructions.

## Connection flow

For built-in providers the admin now:

1. Saves the API key and API URL.
2. Runs **Test Connection**.
3. The server reads the text/chat models available to that API key and caches them.
4. A successful test sets the connection status to Connected.
5. The admin can then enable the provider.
6. Enabled + connected providers appear as individually named AI Bot blocks in Social Media → Automations → Chatbot DM.

Provider model discovery uses the provider's model-list API:

- OpenAI: `GET /v1/models`
- Gemini: `GET /v1beta/models`, filtered to models supporting `generateContent`
- Anthropic: `GET /v1/models`

Custom AI integrations can define a comma-separated catalog of supported model IDs because not every custom provider exposes the same model-list endpoint.

## Per-flow model and system instructions

The AI Bot block now owns the settings that can differ by campaign/platform:

- **AI integration** — the connected provider/API key.
- **Chat model** — selected from the models returned by that provider connection.
- **System instructions for this flow** — the specific behavior, tone, business rules, scope and escalation instructions for this automation.
- **If AI is unavailable** — the existing fallback response.

This means the same OpenAI/Gemini/Anthropic connection can be reused while Instagram, Facebook, WhatsApp and X/Twitter flows use different models or different instructions.

## Backward compatibility

- Existing V16.67 database columns `model` and `system_prompt` are retained so old saved data is not destructively removed.
- Existing saved AI flows can still run using their previous integration model until they are edited.
- New/edited AI Response blocks save an explicit `aiModel` in the flow definition.
- The runtime now gives the flow block's system instructions directly to the selected provider and no longer combines them with a global integration-level system prompt.
- No V16.67 files are removed from the complete replacement package. New V16.68 assets are cache-busted from `public/admin/index.html`.

## D1 addition

The existing runtime schema guard adds these columns safely on first V16.68 use, without requiring a manual D1 migration:

- `connection_status`
- `last_tested_at`
- `last_test_error`
- `models_json`

This avoids a duplicate-column deployment problem when the application has already initialized its schema before a later manual migration run.
