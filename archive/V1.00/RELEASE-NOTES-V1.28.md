# DropBeat Dance Studio V1.28 release notes

## Critical production recovery

- Fixes Cloudflare **Error 1102 — Worker exceeded resource limits** introduced by V1.27.
- Fixes the unified Login screen remaining on **Signing in…** and then showing **This request could not be completed. Please try again.**
- Restores the public bootstrap request used by the hero, memberships, plans, banners and student stories.

## Exact cause and repair

- V1.27 changed the global full-schema marker for four checkout columns. An existing V1.26 database therefore appeared to need the complete legacy repair pass. Concurrent browser requests could start that pass more than once; the reproduced path issued 1,023 D1 operations before serving the page.
- V1.28 accepts both established full-schema markers and gives the four V1.26 checkout columns their own lightweight persistent patch. The verified existing-database upgrade now uses 11 D1 operations.
- Concurrent cold-start requests now share one schema-initialization promise instead of launching duplicate repairs.
- `/api/portal/auth/*` routes no longer run full application-schema maintenance in middleware.
- The unified Login handler checks valid Admin credentials before preparing optional Student/Coach portal tables. The verified Admin path uses four D1 operations.
- Login, Checkout, My Orders, Payment, Student Dashboard and Coach Dashboard documents no longer start unrelated public marketing-maintenance work.

## Preserved behavior

- V1.27's checkout-column recovery, Billing Length, dynamic plan description and payment-link repair remain included.
- First Payment Only coupons still discount only today's payment; later renewals use the offer price.
- Student and Coach login behavior, admin credentials, existing database records, migrations, payment gateways and public content-management logic are preserved.
- No colour, theme or page design file was changed.

No table, row, plan, coupon, order, subscription, customer, hero, banner, image or colour setting is deleted or reset.
