# Urgent Casting V12 — Requests, Subscription Controls & Admin Identity

This build is an additive update on the supplied V11 package.

## Fixes included
- Removed the `/requests -> /requests.html` Pages rewrite that could loop with Cloudflare Pages extensionless HTML handling.
- Added a Business Dashboard Requests card counting only New + In Progress requests.
- Added always-visible Resume, Pause and Cancel controls in Client Details → Payments, including no-subscription guidance and a stronger permanent-cancellation confirmation.
- Moved invoice/statement tagline directly beneath the brand name while preserving clickable branded PDF header linking to the configured website.
- Added one-time-payment aware invoice and statement wording/labels.
- Sidebar identity now shows `Admin` by default rather than the public brand name.
- Added Admin Security → Admin Display Name, capped at 20 characters, with the standard themed information helper.

Existing V11 customer, request, payment, document, branding and gateway logic remains in place; V12 adds/wraps only the requested behavior.
