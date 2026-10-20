# Urgent Casting V8 — Help Collision, Tracking/Payments Help & Anonymous Journey Cleanup

This additive build starts from the supplied V7 package and preserves the existing business logic.

## UI fixes
- Website Colors information helper now occupies its own row above the color controls, so Reset Colors remains fully clickable.
- Tracking: Google & Meta Tracking and Other Ad Pixels now expose the standard information helper after their dropdown is opened.
- Home Banner helper is repaired as a dropdown helper instead of an overlapping card helper.
- Plans & Offers modal helper sits in the modal header before Close with proper spacing.
- Product Display helper is re-applied after dynamic rendering and remains visible.
- Dashboard Subscription and Payment overview helper controls are moved into their action rows so Apply / Refresh Payments do not collide.
- Razorpay, PhonePe and Stripe now have solution-oriented help cards using the same themed I / circular Back pattern.

## Storage
A new **Old Anonymous Visitor Journeys** Safe Cleanup category groups anonymous visitor activity by device/visitor ID.

Eligibility is deliberately conservative:
- no linked `contact_leads.visitor_id` exists, so submitted contact/profile clients are protected; and
- the first visit is over 30 days old; and
- the device has activity on only one recorded visit day (repeat visitors on another day remain protected).

Review shows the visitor/device ID, first/last seen timestamps, page views, unique pages, sources and paths. Deleting a selected eligible journey removes only its anonymous `visitor_events` and matching anonymous `visitor_cart_state`; client/contact/profile/order/payment records are not deleted.
