# Urgent Casting V16.53 — Release Verification

Baseline: user-provided V16.52 complete replacement ZIP.

## Requested changes verified

- Homepage retains the fixed SEO title `Urgent Casting | Verified Audition Updates on WhatsApp` when the marquee setting is disabled.
- Search-crawler test: Googlebot-style user agent cannot receive the marquee title even when the marquee setting is enabled.
- Homepage includes canonical URL, static title/Open Graph title, robots directive and WebSite structured identity.
- Integrations has a single visual stabilization phase while legacy renderers finish; content is revealed once instead of blinking repeatedly.
- Brand Settings order: Profile, Banners, Website Colors, Social Media, Legal Info, Checkout, Maps & Reviews, Storage, Login.
- Banners reuses the existing `#banners` panel and its original save/list logic.
- Social Media reuses the existing `#socials` panel and its original save logic.
- Sidebar Home Banners and Social Links are hidden after being merged into Brand Settings.
- Pages is placed under Settings.
- Pages workspace has New Page, Existing Pages and Success Stories; Success Stories reuses the original `#successStories` panel.
- Website Content is renamed Social Media; visible child options are Auditions, Posts and Comments.
- Orders & Leads child counts are converted to positive notification badges; parent group shows their aggregate.
- Social Media group shows an aggregate notification badge from its actionable child badges.
- Backend functions, D1 migrations, wrangler configuration and package configuration are unchanged.

## Verification results

- JavaScript syntax: 258 files passed `node --check`.
- Cloudflare Function module import/load: 154/154 passed.
- JSON parse: passed.
- HTML parser: 25 files passed.
- CSS structural/brace check: 71 files passed.
- Local static asset references: 661 checked, 0 missing.
- Playwright title tests:
  - Marquee disabled -> fixed homepage title: PASS.
  - Marquee enabled for a human browser -> marquee controller remains available: PASS.
  - Googlebot-style crawler with marquee enabled -> fixed title, no marquee fragment: PASS.
- Playwright admin-navigation fixture:
  - Website Content -> Social Media: PASS.
  - Social Media visible children = Auditions, Posts, Comments: PASS.
  - Settings contains Tracking, Integrations, Pages, Brand Settings: PASS.
  - Order badge `(-3)` normalized to `3`: PASS.
  - Orders & Leads aggregate example `3 + 1 = 4`: PASS.
  - Social Media aggregate example = 2: PASS.
  - 9 Brand Settings tabs in requested order: PASS.
  - Banners and Social Media tab routing: PASS.
  - Success Stories inside Pages routing: PASS.
  - Integrations stabilization class is added during load and removed after settling: PASS.
- Baseline safety:
  - `functions/`: 0 differences from V16.52.
  - `migrations/`: 0 differences from V16.52.
  - `wrangler.jsonc`: unchanged.
  - `package.json`: unchanged.
  - No new D1 migration required.
