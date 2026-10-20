# Urgent Casting — SEO, Performance, Security & Domain Setup

This deployment includes application-side SEO/performance/security changes while preserving the existing business logic and visual design.

## Search engine files

- XML sitemap: `/sitemap.xml`
- Friendly shortcut: `/sitemap` redirects permanently to `/sitemap.xml`
- Crawler rules: `/robots.txt`
- Security contact: `/.well-known/security.txt`
- PWA manifest: `/manifest.webmanifest`

Submit `https://urgent-casting.com/sitemap.xml` in Google Search Console and other webmaster tools after the custom domain is live.

## Canonical domain

The project uses **https://urgent-casting.com** as the canonical production URL. The middleware redirects the `www` production host to the non-WWW host with HTTP 301, while leaving the `*.pages.dev` preview hostname available for testing.

For this to work after launch, attach both `urgent-casting.com` and `www.urgent-casting.com` to the same Cloudflare Pages project. DNS must point both hostnames to the Pages project.

## HTTPS

Cloudflare Pages provisions TLS for connected Pages/custom domains. The application middleware also redirects HTTP requests to HTTPS and sends HSTS on HTTPS responses.

## Email authentication: SPF, DKIM and DMARC

These are **DNS records**, not values that should be invented in the website code. Configure them at the DNS/domain provider after choosing the actual sending provider (Google Workspace, Microsoft 365, Resend, Mailgun, SendGrid, Amazon SES, etc.).

The exact SPF include, DKIM public key and DMARC policy depend on that provider. Add the records supplied by the provider to the DNS zone for `urgent-casting.com`.

## Performance implementation

- Public home data is fetched through a single bootstrap request instead of many serial requests.
- Product image and variant database lookups are batched to avoid N+1 D1 queries.
- Uploaded D1-backed media uses Cloudflare's Cache API at the edge.
- The first hero image is loaded/decoded before it is shown; the remaining hero images are immediately preloaded in parallel so the slider does not wait until each slide becomes active.
- Above-the-fold membership images load eagerly; below-the-fold media may still use native lazy loading to avoid wasting initial bandwidth.
- Images use fixed dimensions/aspect ratios to reduce layout shift.
- Static files use browser cache headers and Cloudflare Pages CDN delivery.

Cloudflare Pages/Cloudflare also handles text compression (Brotli/Gzip when supported) at the platform edge, so no separate compression library is required in this project.

## Privacy / cookies

A cookie preference banner is included. Necessary storage remains available for site functions. Optional analytics and advertising tags wait for the visitor's choice. The admin Tracking page can independently enable/disable supported tracking integrations.

## Social previews and structured data

Public pages contain canonical Open Graph/Twitter metadata. Published audition pages are server-rendered with their post title, description and cover image so social crawlers can receive post-specific metadata. Organization/WebSite and product-list structured data are generated without inventing ratings or reviews.

## International pages / hreflang

Do not add hreflang until actual alternate-language or alternate-region URLs exist. Adding hreflang to a single English site without corresponding alternate pages would be misleading. When translated/regional pages are created, add reciprocal hreflang annotations then.

## Dark mode

No automatic dark-theme redesign is forced in this package because the current light/burgundy visual design is an approved project design. `prefers-reduced-motion` and print adaptations are included without changing the normal visual theme.

## Custom fonts

The current project does not depend on a custom `@font-face` download, so `font-display: swap` is not required. If a webfont is introduced later, declare it with `font-display: swap`.

## Core Web Vitals

The implementation is designed toward the usual “good” targets (LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1), but real field results cannot be guaranteed by code alone. They vary with user network/device, third-party scripts, image size and live database/API latency. Validate the deployed custom domain with PageSpeed Insights/Search Console after launch.
