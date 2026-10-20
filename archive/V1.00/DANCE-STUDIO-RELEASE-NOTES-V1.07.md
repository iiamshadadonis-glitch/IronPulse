# DropBeat Dance Studio V1.07

V1.07 is a complete replacement package based on the supplied V1.06 code. Existing payment, subscription, CRM, analytics, automation, publishing and integration contracts remain in place; the new work is additive around them.

## Admin authentication and theme continuity

- Added a first-paint DropBeat authentication shell and hid both the login form and dashboard until the session check finishes.
- An authenticated refresh now stays on the dashboard. The login form is shown only after a confirmed HTTP 401 response; temporary network/database errors do not falsely log the admin out.
- Placed the DropBeat admin theme as the final runtime CSS layer and changed active legacy fallbacks and downloadable filenames to DropBeat wording.
- Advanced public/admin cache keys to V1.07 and revalidated HTML shells so a normal refresh discovers the current assets.

## Plans, classes, coaches and members

- Added an optional **Class, Batch & Coach Mapping** section to Add/Edit Plan:
  - class/event name and online, offline, demo, trial or webinar type;
  - coach and multiple dance styles;
  - start date, class time, duration, class days and days per week;
  - location/joining information;
  - recurring reminder channels and lead time.
- Paid orders for mapped plans create/update a current class member automatically. Failed, cancelled, refunded or expired payment/subscription states move the member to Past Members and create an admin notification.
- Razorpay, PhonePe and Stripe webhook/result paths feed the same lifecycle synchronizer without replacing their existing gateway logic.
- Added calendar-first Online Class, Offline Class and Webinar workspaces with monthly session/member counts, selected-day summary cards, daily previous/next navigation and scheduled-event rows.
- Added per-session reschedule, delay, cancel, holiday and leave overrides. Cancelled/holiday/leave sessions are omitted from active calendar counts; pending reminders are cancelled or rescheduled accordingly.
- Added coach/founding-team management with photo, designation/badge, biography, dance styles, availability and active/draft status.
- Public plan cards/details show class schedule, dance styles and linked coach profiles. The About page renders active coach/founding-team cards and supports direct coach anchors.

## Student Stories and plan badges

- Retains the V1.06 Student Story repair, server write verification, Active/Draft behavior and visible diagnostics.
- Keeps plan badges opaque and high contrast on Home, Offers and individual plan pages.

## Technical on-page SEO

- Unique titles, descriptions and canonical URLs for indexable static pages.
- Server-rendered, plan-specific metadata and Course structured data for `/offer-details?plan=…`.
- Server-rendered blog/list metadata with Blog, BlogPosting, DanceSchool and breadcrumb structured data.
- Open Graph and Twitter metadata, including image metadata, on all indexable public shells.
- Crawler-visible JSON-LD for static pages; dynamic Course, BlogPosting, WebPage, BreadcrumbList and DanceSchool data where applicable.
- Dynamic XML sitemap entries for core pages, plans, custom pages and published Dance Tips; a dedicated dance-class sitemap alias is included.
- `robots.txt`, private-page `noindex`, 301 redirects for renamed legacy URLs, a real 404 response/page, HTTPS enforcement and canonical-host redirects.
- Semantic headings, internal navigation, descriptive anchor text, responsive layout and versioned assets are retained. Keyword content is written naturally; no artificial keyword-density target is used.

Off-page SEO—citations, backlinks, press coverage, directory listings and external social promotion—still requires ongoing work outside the website code.

## Database and deployment

- Adds migration `0044_dropbeat_class_plans_coaches_calendar.sql`.
- Run `npm run d1:migrate:remote` before `npm run deploy`.
- Verify with `npm run test:dance-v1.07`.
