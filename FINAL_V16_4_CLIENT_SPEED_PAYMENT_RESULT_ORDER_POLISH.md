# Urgent Casting V16.4 — Client Speed, Payment Result and Orders Polish

This build is an additive update on the supplied V16.3 replacement. Existing branding, payment-gateway selection, CRM identity matching, invoice rules, audition logic and the existing admin theme are retained.

## Changes

- Client Details now avoids synchronous historical candidate backfill while the modal is opening and removes redundant payment-receipt schema DDL from the hot read path. Independent D1 reads are parallelized, historical identity candidate recovery is queued after the response, and Client Details is prefetched from admin links on hover/focus. Previously loaded clients are shown immediately from the in-session cache while the latest saved record refreshes.
- Generate Invoice now renders from the already-saved CRM/payment information immediately. Gateway reconciliation continues in the background and does not block the invoice form.
- Orders keep the last complete saved view in session storage and show it immediately while the latest D1/webhook state is fetched quietly. While Orders is visible, saved webhook/database changes are checked silently and the affected row/bucket is refreshed only when data changes.
- Trial orders are recognized from the saved trial configuration plus the actual payment-versus-recurring amount, so older test payments such as ₹1.12 are not mislabelled as a full subscription payment when the real recurring mandate is much larger.
- Order status badges use distinct semantic colors: Subscription/paid green, Trial blue, One-Time purple, Pending amber, Cancelled/Failed red.
- Orders help uses the existing themed information icon. When the help face is open, that same toolbar button becomes the existing themed circular Back icon; there is no separate Back button at the bottom.
- Payment Successful now displays a 15-second live home-page redirect countdown. The brand/logo area is clickable and returns to the home page.
- Payment Failed now shows `Payment Failed`, displays the actual amount being attempted, gives solution-oriented retry/check-status guidance, and uses the same current payment-result script as the success page. Check Payment Status visibly changes to `Checking…` while running and redirects to Payment Successful if confirmation is found.
- The payment-result API exposes the actual attempted amount: trial amount for an initial trial attempt, otherwise the gross amount saved for the payment request.
- Admin session reads, login writes and the schema-ready check use short retry protection for transient D1 internal/busy errors. A temporary D1 error no longer causes the front-end API helper to treat every 401-shaped backend failure as a confirmed logout.

## Database

No manual D1 migration is required for V16.4.
