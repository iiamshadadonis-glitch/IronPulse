# Final Subscription + Storage Dashboard Touch-ups

This package is based on the latest `urgent-casting-final-profile-media-traffic-touchups` project and keeps the existing website, checkout, CRM, lead, order and payment flows intact.

## Client Details – Time Spent
- Replaced the code-like `24 H 4 M 24 S` display with separate number/unit blocks.
- Example: `24` above `hours`, `4` above `mins`, `24` above `secs`.
- Zero-value leading units are omitted where appropriate.

## Subscriptions Overview
The former Pending Collections block is replaced with a live Subscriptions Overview containing:
- Total Subscriptions
- Active Subscriptions
- Successful Subscriptions
- New Subscriptions
- Renewals
- Upcoming Renewals
- Failed Subscriptions
- Cancelled Subscriptions

Every card is clickable. Lists are refreshed from Razorpay using the existing configured credentials. Failed subscription rows use the latest Razorpay failure information captured by the existing signed webhook flow when available.

The Total Subscriptions modal supports:
- Last 3 days / 1 week / 2 weeks / 3 weeks / 1 month / 2 months / 3 months / custom range
- Daily or period-total view
- Selected-period summary cards
- Subscription amount received
- Average received per day
- Successful subscription charges
- Daily New / Successful / Renewals / Failed / Cancelled counts
- Clickable daily counts to open client-level details
- Clickable client names to open the existing unified Client Details modal

No live subscription snapshot is written back merely because the admin opens or refreshes this report.

## Storage
A new **Settings → Storage** page was added.

The admin-facing wording intentionally avoids infrastructure/database terminology. It shows:
- Allocated space
- Used space
- Remaining space
- Remaining percentage in a battery-style indicator
- Safe-cleanup categories only

The default allocation is configured through `APP_STORAGE_LIMIT_MB=500` in `wrangler.jsonc`. This can be changed later if the site's storage allocation changes.

Safe cleanup exposes only:
- Expired/inactive offer codes
- Anonymous website activity older than six months and not linked to a client
- Anonymous abandoned-cart activity older than six months and not linked to a client
- Expired verification attempts
- Expired customer sessions
- Expired admin sessions

Current client records, orders, subscriptions, payments, refunds, profiles and profile media links are deliberately not exposed for Storage cleanup.

Cleanup supports review, checkboxes, select all shown, Delete Selected, Delete All Eligible, and a second irreversible-delete confirmation dialog. Deletes remove eligible records only; no schema/field deletion commands are used.

## Files Added
- `functions/api/admin/subscription-overview.js`
- `functions/api/admin/storage.js`
- `public/admin/final-subscription-storage-touchups.js`
- `public/admin/final-subscription-storage-touchups.css`

## Existing Files Updated
- `public/admin/index.html`
- `public/admin/admin.js`
- `public/admin/final-unified-client-crm.js`
- `public/admin/final-unified-client-crm.css`
- `public/admin/final-menu-ads-ssl-polish.js`
- `functions/api/webhooks/razorpay.js`
- `wrangler.jsonc`
