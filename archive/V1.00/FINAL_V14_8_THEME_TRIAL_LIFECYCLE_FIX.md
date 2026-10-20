# Urgent Casting V14.8 — Theme, Trial Checkout and Lifecycle Fix

This build is a targeted continuation of the supplied V14.7 project. Existing CRM, checkout, coupon, payment gateway, request, invoice, statement, product display, tracking, media, and admin flows are preserved unless a change below was necessary for the requested correction.

## Main corrections

- Restored the original V14.6 dark maroon admin sidebar/navigation treatment and original dark public footer behavior. Reset Colors continues to restore the original `#8A0505` / `#FFD45A` palette.
- Subscription Overview now labels the previous successful billing date as **Previous Bill**, rather than reusing a generic record date.
- Client/lead cards and Client Details can show multiple recorded traffic sources, including repeat visits from different sources.
- Trial checkout now carries the trial configuration from the catalog into order creation, gateway subscription creation, checkout summary, payment page, invoice and statement.
- Razorpay trial subscriptions use the configured future start date and upfront trial/authentication amount. The local order does not treat a normal mandate/authentication lifecycle event as the full recurring payment.
- Razorpay payment verification records the actual captured amount, preventing a ₹1 trial authentication payment from becoming a false ₹799/₹1,199 received amount.
- Razorpay Standard Checkout is recreated fresh on each payment-window opening. A provider-hosted Razorpay payment-page fallback is also available if the QR inside Standard Checkout does not load.
- Membership Benefits are restored to payment statements for catalog plans and aggregated into one block when multiple website plans are present. Fully custom-only statements omit that block.
- Enable Trial is visually moved beneath Regular Price / Offer Price while retaining the same subscription logic.
- Existing Orders no longer exposes pause/resume/cancel/refund gateway controls. The workflow dropdown and Save remain, with In Process, Delivered, Completed, Cancelled and Failed available.
- Cancelled/failed subscription customers are synchronized into inactive/unsubscribed customer lists, including customers who cancelled before their first payment. A later successful subscription automatically returns the same phone number to Active Subscribers.
- Home Banner Link Type / Link Value fields are hidden from the admin form; the backend keeps a safe default destination automatically.

## Database

No new migration was added in V14.8. The existing 14 migrations remain authoritative.

## Deployment

Upload the contents of this project directly to the existing repository root. Do not nest the files inside another version folder.
