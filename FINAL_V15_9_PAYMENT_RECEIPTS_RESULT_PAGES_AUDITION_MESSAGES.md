# V15.9 — Payment receipts, result pages and audition messages

This build is based directly on the V15.8 replacement package and keeps the existing visual theme and unrelated workflows unchanged.

## Auditions

- Automatic Ads now returns a solution-oriented error when no ad platform is configured.
- The inline Audition message tells the admin to either turn Automatic Ads off or configure an ad platform in Settings → Ad Integrations.
- The bottom admin notification uses the same practical instruction instead of a generic action-failed message.
- Successful Publish, Draft and Schedule actions now use plain-language messages.
- Published articles show a visible green result message outside the form card, so it remains visible after the Post New Audition Update card collapses.

## Exact payment receipts

- Added `payment_receipts`, an idempotent D1 ledger for actual successful monetary transactions.
- Trial/setup authentication receipts are stored separately from future recurring subscription charges.
- Razorpay verification records the exact captured payment amount and keeps a paid trial/setup order in `authenticated` state until a real recurring charge is received.
- Razorpay, Stripe and PhonePe webhooks record only successful monetary events as receipts and preserve authentication state when later lifecycle-only updates contain no new payment.
- Existing verified gateway events are backfilled into the receipt ledger during the schema upgrade.

## Admin payment reporting

- Payments Overview revenue and today's received amount now use actual receipts rather than the recurring order value.
- Client Details Paid Amount uses actual receipts.
- Trial subscriptions show `Authenticated` on the subscription card until the recurring plan charge is actually received.
- Payment Records show the trial/authentication payment as the actual amount received and keep the future subscription charge as Pending.
- Orders retain the recurring order value but, for authenticated trial orders, also show the smaller amount actually collected.
- Subscription Overview Amount uses the latest amount actually collected; Next Amount remains the upcoming recurring charge.
- Gateway refreshes no longer downgrade/overwrite a trial authentication into a fully paid recurring order merely because an authentication invoice/payment exists.

## Customer payment result pages

- Added `/payment-success` and `/payment-failed`.
- Razorpay, Stripe and PhonePe return paths now use these pages.
- The success page shows only the payment amount actually received, gateway, transaction reference, date and plan.
- Trial success does not display the future recurring plan charge on the webpage.
- The customer can download an invoice from the success page.
- The failed page provides Retry Payment and Check Payment Status actions.
- Success pages poll the receipt status briefly when a gateway redirect arrives before its webhook.

## Trial invoice correction

- A trial invoice uses the actual trial/authentication receipt as Amount Received.
- Regular and offer prices remain reference values; the recurring subscription charge is explicitly marked as not collected today.
- Balance Due Today remains zero after the current trial payment is successfully collected.
- Amount in words is calculated from the actual receipt.
- Non-trial paid invoices retain their existing behavior.

## Migration

- Schema version: `v15-9-payment-receipts-success-pages`
- Migration: `0022_payment_receipts_success_pages.sql`
- Normal auto-schema initialization creates the table; manual SQL is not required in the standard deployment flow.
