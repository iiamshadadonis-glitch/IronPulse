# DropBeat Dance Studio V1.26

This complete replacement package is built from the supplied V1.25 code. It preserves the existing colour themes and paid-trial workflow while adding administrator-controlled billing length, correcting first-payment-only coupon renewals, and reducing the shared light/dark control.

## Deploy

1. Back up the current Cloudflare Pages project and D1 database.
2. On Windows, run `DEPLOY-V1.26-WINDOWS.bat`; on macOS/Linux, run `bash DEPLOY-V1.26-MAC-LINUX.sh`.
3. The helper runs the complete V1.26 regression suite before applying migration `0055_dropbeat_billing_interval_first_payment_v1_26.sql` and publishing.
4. Clear the browser cache or open the site once in a private window after deployment.

## Verify after deployment

- Open Sales → Plans & Offers → Add or Edit. Confirm **Billing Length** appears beneath Billing Period, defaults to 1, and its sentence updates with the selected period and price.
- Create a Monthly + 3 plan and confirm checkout says Every 3 months and creates a three-month recurring schedule.
- Apply a 50% coupon configured as **First Payment Only** to a ₹349 offer. Confirm checkout/payment shows ₹174.50 today and ₹349 for later renewals.
- Apply a coupon configured as **All Subscription Payments** and confirm both today and later renewals use the discounted amount.
- Confirm Enable Trial and its existing preview/payment behavior remain unchanged.
- Confirm the sun/moon control is compact on public pages and dashboards and no longer overlaps Refresh in admin.

The migration is additive. It does not delete, reset or rewrite existing plans, orders, subscriptions, coupons or customer data. Existing plans retain their earlier billing behavior until an administrator edits and saves them with Billing Length.
