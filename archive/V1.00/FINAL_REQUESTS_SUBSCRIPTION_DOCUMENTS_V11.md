# Urgent Casting V11 — Requests, Document PDF Polish and Subscription Controls

This build is an additive update on the supplied V10 project.

## Main additions
- Invoice/statement PDF header: current logo + Brand Name + tagline with independent spacing; clickable brand/logo link to the live website.
- Invoice status spacing corrected and status colors retained.
- Customer-friendly invoice payment terms now include the actual billing-cycle validity period, pause/cancellation guidance, recurring-payment convenience, current-price caveat for a future re-subscription, and refund-policy guidance.
- Membership benefits remain in the payment statement; invoice adds them only when the one-page layout has enough room.
- Payment Statement requires Apply / Refresh before Download, WhatsApp or Gmail. Live gateway refresh failures fall back to saved CRM/database payment records and show a clear warning.
- Invoice and Payment Statement modals now include the themed information helper with scrollable, solution-oriented guidance.
- New public `/requests` workflow for Cancellation, Pause, Restart, Invoice, Payment Statement and Payment / Subscription Support.
- Requests appears below FAQs in the Policies footer and is included in sitemap/redirects.
- New Orders & Leads → Requests admin panel with new-request notification badge, filters, color-coded request types, client links, context-aware Edit behavior, resolve and permanent delete.
- Invoice requests open the client's Invoice tab. Statement requests open Payments and the Payment Statement window. Cancellation/Pause/Restart requests open Payments.
- Client Payments adds icon-only Resume/Pause/Cancel subscription controls plus a Payments help card. Backend performs only actions supported by the real gateway/current subscription state.
- Favorites now shows separate Favorite and Client columns, WhatsApp, Plan / Offer, Subscription, Last Subscription and Next Action.
- New `service_requests` D1 table/migration and an automatic FAQ entry explaining the Requests workflow.

## Subscription safety
The Resume/Pause/Cancel icons call the actual gateway. They do not pretend that a terminal canceled/revoked subscription can be restarted. Razorpay/Stripe canceled subscriptions require a new subscription, and customer-controlled UPI/PhonePe pause/unpause remains customer controlled where required.

## Database
Migration added: `migrations/0013_customer_requests.sql`.
The middleware `ensureSchema()` also creates the table automatically on the first API request after this version is deployed.
