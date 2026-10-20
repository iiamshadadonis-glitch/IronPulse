# V16.94 — Integration, Conversion, Heat-map and Webinar Usability

- Consolidated Google Analytics 4, Google Tag Manager and Meta Pixel ownership under Settings → Integrations → Marketing. Existing Tracking values are imported automatically when the matching Marketing field is empty, while Tracking retains search-engine verification only.
- Replaced provider enable checkboxes with compact themed toggle switches and removed the duplicate browser disclosure arrow so every Marketing and Webinar card has one dropdown arrow.
- Rebuilt Google Tag conversion controls around clear `send_to` destinations, confirmed purchase/lead triggers, searchable destination pages, Open Page, and additional custom conversion rows.
- Added Pages → Custom Code with administrator-only create, edit, enable, disable and delete controls; head, body-start and body-end placement; all-page or selected-page scope; and consent-category gating.
- Corrected Heat Maps to render true desktop, tablet and mobile canvases. Reports now include unique sessions, average scroll depth, click intensity, scroll-reach bands, attention bands and top engagement elements with practical reading instructions.
- Expanded Marketing Analytics help with provider-by-provider sync status, metric full forms, formulas, examples and a prominent risk disclaimer.
- Replaced fixed Webinar reminder checkboxes with an enable toggle and repeatable reminder rows supporting minutes, hours, days, weeks and months plus removable Email, WhatsApp, SMS and Admin Call tags. SMS is available only when its relay is configured.
- Added a scheduled-events table with reminder plans and actionable Admin Call tasks.
- Made the V16.94 database additions self-initializing on first use. A reference migration remains included for managed migration workflows, but this replacement does not require the administrator to run terminal commands.

Deployment for a non-technical administrator: upload/deploy the complete V16.94 replacement folder using the same Cloudflare Pages method already used for previous replacement ZIPs, then hard-refresh the admin page once. Do not run `npm run d1:migrate:remote` separately for this release.
