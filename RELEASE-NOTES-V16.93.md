# V16.93 — Marketing, Webinar and Heat-map Reliability

> Historical release notes. The current V16.94 replacement self-initializes its added database tables; follow `RELEASE-NOTES-V16.94.md` and do not use the old command-line migration instruction below for V16.94.

- Rebuilt Marketing and Webinar integrations as full-width, individually expandable cards with provider-specific status, test, enable, edit and disconnect actions.
- Replaced the ambiguous “Connected Social Advertising” checklist with real Meta, Google/YouTube, Pinterest, X and Snapchat advertising connection forms.
- Added Mailchimp Marketing API connection testing plus an explicit workspace-draft and reviewed-send workflow.
- Clarified that a Google/social workspace plan does not publish an advertisement or spend money; provider publishing remains a deliberate provider-side action.
- Added unique solution-oriented help for Marketing, Google Ads, Social Media Marketing, Email Marketing, Funnels, and every integration card.
- Repaired the heat-map device preview, searchable page selector, consent/no-data diagnostics and one-minute batched flush.
- Batched heat-map D1 writes in one D1 request and preserved every existing D1 read safeguard and cache rule.
- Improved Marketing Analytics toolbar alignment and line hover detection along line segments.

Deployment: apply D1 migrations, deploy the full folder, then hard-refresh the admin page once so the V16.93 cache-busted assets load.
