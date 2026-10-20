# Urgent Casting V16.51 — Integrations Help, SEO Summary, API Help and Marquee Fix

V16.51 is a targeted follow-up to the exact uploaded V16.50 package. Existing integration credentials, payment logic, social publishing logic, D1 schema and the visual color theme are preserved.

## Integrations → SEO
- Keeps one visible status badge at the extreme right of the summary only.
- Removes the duplicate inline `Connected` text from `SEO Connection`.
- Removes the duplicate inline `Eligible pages only` label from Google Indexing API while preserving the far-right status badge.
- Keeps a hidden compatibility marker for the older V16.48 SEO status helper. This prevents the older helper from rebuilding the summary and causing the apparent continuous blinking/flicker.

## Facebook and Instagram help
- Replaces the old generic flip-card copy with step-by-step solution guidance.
- Includes Meta app creation, official Meta links, callback configuration, the permissions used by this platform, token/Page-token diagnostics, Access Token Debugger guidance, token-expiry cautions, exact Urgent Casting field mapping and final Save/Connect/Test steps.
- The V16.8 source renderer itself now contains the new help, so refreshing Integrations cannot restore the old generic help.

## Integrations → Ad Networks
- Adds reserved right-side spacing for Google AdSense, Other Ad Networks and Custom Ad Networks so the status badge does not collide with the circular dropdown arrow.

## Integrations → API Settings
- Removes the duplicate visible Webhook Endpoints list from API Settings. The existing webhook routes/backend behavior remain unchanged and their URLs continue to be managed in their respective integration cards.
- Adds the standard themed information button to the Automation Endpoints card.
- The flip side explains Bearer authentication and every currently exposed automation endpoint, with n8n/Make/Zapier-style setup steps and safe-use examples.

## Brand Settings → Marquee Tab Title Effect
- Fixes the legacy public script that previously started a title marquee independently of the Brand Settings toggle.
- The new settings controller owns title animation immediately during page load.
- Disabled/default = fixed browser-tab title.
- Enabled + saved = requestAnimationFrame-based character-by-character marquee.
- Public HTML references are cache-busted to V16.51 so browsers request the corrected controller instead of a cached V16.49 copy.

## Preservation
- No Cloudflare Function source was changed.
- No D1 migration was changed or added.
- No payment/integration credential records are cleared or disconnected by this release.
- No root/theme palette variables were changed.
