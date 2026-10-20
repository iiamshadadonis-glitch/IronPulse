# DropBeat Dance Studio V1.27 release notes

## Included repairs

- Fixes **Continue to Payment** on databases upgraded from V1.25/V1.26. V1.26 added billing and first-payment fields without advancing the runtime schema marker, so an existing database could skip those additive columns and reject every order insert.
- Advances the self-healing schema marker and performs the four V1.26 checkout-column repairs before the larger compatibility pass. Existing plans, coupons, orders, customers and subscriptions are preserved.
- Fixes the admin dashboard remaining on **Opening secure admin / Checking your existing session**. The V1.26 Billing Length preview rewrote its own observed text on every pass, creating an endless microtask loop. The preview is now idempotent and only changes the DOM when its value actually changes.
- Adds a 12-second timeout to admin session verification. A stalled network request now presents a retry action instead of leaving the loading screen indefinitely.
- Cache-busts only the repaired admin bootstrap and Billing Length script so browsers cannot reuse the faulty V1.26 copies.

## Preserved V1.26 behavior

- Billing Length and its dynamic monthly/yearly description remain available.
- First Payment Only coupons still charge the discounted first payment and the full offer price on later renewals.
- All Subscription Payments coupons, trials, existing payment-gateway priority and existing colour themes are unchanged.

No table, row, plan, coupon, order, subscription, customer record or colour setting is deleted or reset.
