# DropBeat Dance Studio V1.27

This complete replacement package is built directly from the supplied V1.26 code. It repairs the two V1.26 runtime regressions without changing the existing colour themes or unrelated business logic.

## Deploy

1. Back up the current Cloudflare Pages project and D1 database.
2. On Windows, run `DEPLOY-V1.27-WINDOWS.bat`; on macOS/Linux, run `bash DEPLOY-V1.27-MAC-LINUX.sh`.
3. The helper installs dependencies, runs the complete V1.27-to-legacy regression chain, applies additive migrations and publishes only after the tests pass.
4. Open the deployed site once in a private window. V1.27 also cache-busts both repaired admin scripts.

## Verify after deployment

- Log in as admin. The secure-session screen must close and the dashboard must become clickable.
- Open Sales → Plans & Offers and confirm Billing Length and its dynamic description still work.
- From Checkout, continue without a coupon and confirm the payment page/link opens.
- Apply a First Payment Only coupon and confirm the discounted amount is charged today while the full offer price remains the future renewal amount.

The first API request after deployment automatically repairs the missing V1.26 checkout columns even when migration `0055_dropbeat_billing_interval_first_payment_v1_26.sql` was not previously applied. The repair is additive and preserves all existing data.
