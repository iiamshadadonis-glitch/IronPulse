# Changes in this replacement package

- Added working `/sitemap` -> `/sitemap.xml` route and updated XML sitemap.
- Added robots.txt, canonical URLs, social metadata, structured data hooks, manifest and security.txt.
- Added HTTP->HTTPS and WWW->non-WWW canonical redirects for production custom domain.
- Added security headers including HSTS and CSP while preserving existing integrations.
- Reworked first-load data path to avoid serial API calls and late per-slide hero fetching.
- Batched public D1 product/image/variant queries and cached immutable uploaded media at the Cloudflare edge.
- Added cookie consent with optional analytics/ads gating.
- Added contact-form honeypot spam protection.
- Added accessibility/print/reduced-motion/layout-stability polish.
- Added per-tracker enable/disable toggles in Admin -> Settings -> Tracking.
- Tightened the Stripe payment card layout.
- Added spacing below membership product cards before the disclaimer notice.
- Preserved existing business logic and admin integrations.
