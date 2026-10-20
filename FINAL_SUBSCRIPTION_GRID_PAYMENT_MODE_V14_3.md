# Urgent Casting V14.3 — Subscription Grid + Payment Mode Fix

This package is based on the supplied V14.1 build-safe project and keeps the existing V13/V14 business logic in place.

## Changes in this revision

1. Fixed the Cloudflare Pages Functions build issue in `functions/_lib/lead-profile.js` by keeping the refreshed lead variable mutable (`let`). No CRM matching rule was changed.
2. Fixed the Subscriptions Overview modal grid used by all eight cards:
   - Total Subscriptions
   - Active Subscriptions
   - Successful Charges
   - New Subscriptions
   - Renewals
   - Upcoming Renewals
   - Failed Subscriptions
   - Cancelled Subscriptions
3. Corrected the late CSS override that previously defined only 12 columns while the UI rendered 15 columns. That mismatch caused the remaining headers and cells to wrap into a second grid row.
4. The detailed subscription grid now uses one fixed 17-column row with horizontal scrolling and wider modal padding.
5. Column labels are clearer: Gateway, Payment Type, Payment Mode, UPI ID, Record Date, Next Charge, Next Amount, Total Cycles, Paid Cycles, Remaining, and Attempts / Note.
6. Added best-effort payment-method information from payment webhooks for Razorpay, Stripe and PhonePe.
7. For Razorpay list rows that do not already have a stored payment method, a small bounded live enrichment checks the related payment so older records can also show Card / UPI / Net Banking where Razorpay returns it. If the method is UPI, the UPI ID/VPA is shown when returned by the gateway.
8. No new payment-gateway customer is inserted into CRM. The existing exact phone/email merge rule is unchanged.
9. Updated the Business Dashboard help text to explain:
   - Hot Leads remain hot for a maximum of 3 days from the latest lead update.
   - Recent Leads cover the latest 7 days.
   - matched successful subscription or one-time payments are excluded from the active lead workflow.
   - the recommended follow-up workflow for converted and not-interested prospects.

## Files intentionally changed

- `functions/_lib/lead-profile.js`
- `functions/api/admin/subscription-overview.js`
- `public/admin/final-multigateway-subscription-storage.js`
- `public/admin/final-payment-ui-billing-grid-followup.css`
- `public/admin/final-v7-self-learning-ui.js`

All other project files are carried forward unchanged from the supplied build-safe package.
