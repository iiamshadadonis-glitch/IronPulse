# V16.92 release notes

## Marketing integrations and consent

- Added Marketing beside Ad Networks inside Settings → Integrations.
- Added Google Tag, Google Tag Manager, GA4, Google Ads API, Meta Ads / Conversions API readiness and connected-social advertising settings.
- Meta lead, add-to-cart and confirmed-purchase events can be sent through Conversions API when it is enabled and the visitor granted Ads consent.
- Optional tags load only after the matching Analytics or Ads consent choice.
- Purchase conversion events wait for a gateway-confirmed success state; opening a success URL alone never records a purchase.
- Google and Meta reporting can be synchronized explicitly from Marketing Analytics. There is no new background browser polling.

## Marketing & SEO workspace

- Added Marketing Home, Google Ads, Social Media Marketing, Email Marketing and Funnels.
- Campaigns are saved as drafts until a supported, approved provider account is connected and publishing is completed.
- Funnels store progressive first-party audience stages, frequency planning and purchaser exclusion.
- The CRM can coordinate audience stage and creative intent; an exact cross-platform impression sequence is not guaranteed because each advertising platform controls its auctions, eligibility, pacing and delivery.

## Marketing Analytics and Heat Maps

- Added daily, weekly, monthly, yearly and date-range marketing analytics with Line, Vertical Bar, Horizontal Bar and Pie views.
- Empty selected periods remain visible as zero-value periods instead of disappearing from comparisons.
- Added Spend, Revenue, Impressions, Clicks, Leads and Conversions metrics plus ROAS, CPC, CPM, CPA and CAC summaries.
- Added viewport-safe hover details.
- Added consented, anonymous Heat Map, Scroll Map and Attention Map aggregates with device filters and top-engagement elements. Form values and keystrokes are never collected.

## Webinars, classes and meetings

- Added Online Classes, Offline Classes and Demo / Webinar workspaces.
- Added Google Calendar / Meet, Zoom server-to-server OAuth and external meeting-link settings under Integrations → Webinars.
- Added save, test and disconnect controls; disconnect removes the selected provider's stored credentials.
- Added existing-customer search, new-customer entry, Meet Now / scheduled event flows and configurable Email / WhatsApp reminders.
- Reused the existing branded Gmail and WhatsApp senders.
- Added authenticated `/api/automation/webinar-reminders` GET/POST processing for due reminders.

## Database and compatibility

- Migration `0039_v16_92_marketing_webinars.sql` adds isolated marketing, heat-map and webinar tables and indexes.
- Existing Business Ops, sales, customers, inbox, automation, payment, brand theme, D1 read safeguards and Growth Analytics behavior are preserved.
