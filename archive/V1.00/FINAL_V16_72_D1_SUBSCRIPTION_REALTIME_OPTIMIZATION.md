# Urgent Casting V16.72 — D1 Subscription Realtime Optimization

V16.72 is a targeted add-on to V16.71. It preserves the existing website/admin theme and business logic while removing high-frequency D1 work that could exhaust the Cloudflare D1 Free daily row-read/row-write allowance.

## What the audit found

The Subscription Overview had two expensive behaviors:

1. An ordinary Dashboard load first displayed the saved cache and then immediately performed a full live gateway refresh. Multiple existing Dashboard wrappers could call the same loader during startup.
2. Every live refresh rewrote every `subscription_overview_cache` row and deleted/reinserted the selected period's activity cache even when the gateway data had not changed.

A second write amplifier was found in subscription identity enrichment. A live cards refresh called the CRM identity merge for every gateway subscription. That merge re-observed existing lead-field candidates and could update `last_seen_at` repeatedly even when the customer data was unchanged.

The audit also found an older V16.66 Instagram fallback that still performed a remote realtime check every 6 seconds, despite V16.60 already providing the shared 4-second D1 activity-revision watcher and 5-minute remote safety synchronization.

Finally, the abandoned unpaid-order cleanup query was being run on every Dashboard/Orders read. The business rule only expires requests after one hour, so running the same UPDATE scan repeatedly is unnecessary.

## V16.72 behavior

### Subscription Overview

- Normal Dashboard opening is **cache-first and cache-only**. It does not immediately perform a full live gateway fetch if saved data already exists.
- If no cache exists yet, one initial live refresh is allowed for that period so the dashboard can bootstrap itself.
- A new `subscriptions` row in `admin_activity_state` acts as the lightweight subscription change clock.
- The browser checks this one-row activity state every **10 seconds** while the admin is open.
- Razorpay, Stripe and verified PhonePe webhooks bump the subscription revision after a real payment/subscription event.
- When the revision changes, the visible Dashboard performs one live Subscription Overview refresh.
- A **5-minute safety refresh** remains available only while the Dashboard is visible, for provider changes/webhook failures that were not delivered to the application.
- A cross-tab localStorage lock prevents multiple open admin tabs from launching the same live subscription refresh at the same time.
- The explicit Dashboard **Apply** control remains a user-requested live refresh.

### Differential cache writes

`subscription_overview_cache` is now compared with the existing saved row before an UPSERT is issued.

- unchanged subscription row -> **0 cache row writes**
- changed/new subscription row -> one upsert
- genuinely removed subscription row -> one delete

The activity cache follows the same rule. The old whole-period `DELETE` followed by reinsertion of every activity row has been removed. Only new, changed or stale activity entries are written/deleted.

Detailed list enrichment also avoids writing the cache again when the enriched JSON is unchanged.

### CRM identity write amplification

The Dashboard cards live snapshot no longer runs CRM identity writeback for every subscription. Local relationships already resolved by orders/subscribers/leads remain available for the cards. Exact gateway identity enrichment is retained for explicit detailed-list workflows.

Lead-field candidate UPSERTs are now idempotent: observing the same value with the same primary/pending state no longer rewrites the row simply to change `last_seen_at` or source metadata.

### Inbox/Instagram legacy poll

The redundant V16.66 Instagram remote check every 6 seconds was removed. Meta webhooks remain primary and V16.60 continues to provide:

- 4-second tiny DM activity-revision polling
- local Inbox reload only after a revision change
- 5-minute remote Inbox safety synchronization
- one-time Instagram webhook subscription repair

### Abandoned-order maintenance

The one-hour unpaid-order cancellation rule is unchanged, but the UPDATE scan is now shared and throttled to at most once every **15 minutes** instead of running on every Dashboard/Orders GET. The last sweep is persisted in `settings`, so frequent page loads do not repeatedly execute the expensive maintenance query.

## Files added

- `public/admin/final-v16-72-d1-subscription-realtime.js`
- `functions/_lib/order-maintenance.js`

## Existing files minimally updated

- `public/admin/index.html`
- `public/admin/final-v16-66-realtime-automation.js`
- `functions/_lib/admin-activity.js`
- `functions/_lib/lead-profile.js`
- `functions/api/admin/activity.js`
- `functions/api/admin/subscription-overview.js`
- `functions/api/admin/custom-subscription.js`
- `functions/api/admin/dashboard.js`
- `functions/api/admin/orders.js`
- `functions/api/webhooks/razorpay.js`
- `functions/api/webhooks/stripe.js`
- `functions/api/webhooks/phonepe.js`

No CSS/theme/color files were changed.

## Expected D1 effect

A quiet Dashboard should no longer continuously rewrite hundreds of subscription-cache rows. Most 10-second subscription checks read only the single `admin_activity_state` row. Full gateway/cache work occurs only after a subscription revision changes, when the admin explicitly presses Apply, when an empty cache needs its first bootstrap, or during the visible-Dashboard 5-minute safety check. Even during that safety check, unchanged subscription/activity rows are not rewritten.

This does not make D1 usage zero: login/session validation, Dashboard cards, Inbox/Comments activity clocks, genuine webhooks, customer actions and normal admin navigation still perform legitimate database reads/writes. The goal is to remove repeated full scans and unchanged-row rewrites.
