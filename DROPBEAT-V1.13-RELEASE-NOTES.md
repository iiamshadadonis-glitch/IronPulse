# DropBeat Dance Studio V1.13

## Frontend recovery

V1.13 fixes the shared frontend failure introduced in V1.12. A branding helper referred to an undefined variable named `old`. The public APIs were returning the correct database records, but that browser error interrupted the page after the response arrived. One common error therefore affected banners, plans, Student Stories, About, FAQ, offer details and the WhatsApp icon together.

The recovery keeps the existing backend, admin workflows, database schema, payment logic, class logic, coach logic and DropBeat color theme intact.

## Corrected behavior

- Brand Settings home banners render in the public hero slider again.
- The Home, Offers, Festival Offers and Yearly Plans views keep their current Sales data.
- Plan Details no longer fails with `old is not defined`.
- Active Student Stories render on Home and the Student Stories page.
- About and FAQ render the current content saved in Admin, including active FAQ items.
- The WhatsApp floating control receives its visible WhatsApp icon and configured link.
- Coach cards are restored after About content finishes loading, even when the optional presentation script and page data arrive in a different order.
- The About coach area uses cleaner desktop spacing while preserving the existing three-card, two-card and mobile layouts.
- Public content begins rendering without waiting for the optional presentation enhancement.
- Product-image preloading is bounded and deferred, reducing unnecessary startup work.
- V1.13 cache identifiers are applied to public and admin assets and to the short Cloudflare edge response caches.

## Safety boundary

The branding enhancement now has its own error boundary. If a future cosmetic branding operation fails, the already-loaded banners, plans, stories and page content remain visible.

## Database

No new database migration is required for V1.13. The existing 47 migrations and the current D1 data are retained.

