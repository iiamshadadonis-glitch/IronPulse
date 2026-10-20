# V16.94 Release Verification

## Deployment

Use the complete V16.94 replacement folder in the same Cloudflare Pages upload/deployment workflow used for prior releases. The application creates the two new tables and indexes safely with `CREATE TABLE/INDEX IF NOT EXISTS` on first use. No terminal, `npm run d1:migrate:remote`, or separate database step is required for this release.

## Verified Behaviour

1. Settings → Tracking shows Search Verification and explains that GA4, GTM and Meta Pixel now live in Marketing Integrations.
2. Settings → Integrations → Marketing and Webinars show one dropdown arrow per provider and compact themed enable toggles.
3. Google Tag + Conversion Events shows confirmed Purchase and Lead rules, `send_to`, destination-page selection, Open Page and Add Conversion Event.
4. Pages → Custom Code can save disabled-by-default snippets for Head, Body Start or Body End, either on all pages or selected pages. Analytics and Ads snippets respect visitor consent.
5. Analytics → Heat Maps renders Desktop at 1440px, Tablet at 768px and Mobile at 390px, with scrollable previews rather than a squeezed mobile layout.
6. Heat, Scroll and Attention modes show distinct visual overlays, unique-session metrics, engagement rows and detailed Help & Instructions.
7. Marketing Analytics explains ROAS, CPC, CPM, CPA and CAC; Sync Connected Platforms reports each provider separately and never invents unavailable figures.
8. Webinar reminders can be enabled, then built from repeatable value/unit rows and removable Email, WhatsApp, SMS and Call tags. Duplicate channel selections are prevented.
9. New enquiries fire lead conversions only after successful server confirmation. Purchase conversions fire only after confirmed payment success.

Automated verification: `npm run test:v16.94`.
