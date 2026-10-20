# V16.3 — Actual Payment Amount & Orders Workflow

This additive update keeps the existing Urgent Casting theme and payment/CRM architecture while correcting amount display and order-workflow presentation.

## Actual gateway amount

- Subscription Overview normalization now prefers the actual recurring amount returned by Razorpay, Stripe or PhonePe.
- Client Details → Payments uses the gateway/cache recurring amount first and the gross order amount as a fallback.
- Pending trial subscriptions therefore show the real future recurring charge, including enabled taxes/charges (for example ₹799 + 12% GST = ₹894.88).
- Payment Statements and the admin Generate Invoice form use the same actual recurring amount.
- Customer-facing trial invoices remain unchanged in principle: they record only the trial amount received and do not expose the future tax-inclusive recurring charge.
- CRM money formatting keeps paise instead of rounding ₹894.88 to ₹895.

## Invoice and payment-success polish

- The invoice metadata block right-aligns labels and separates the Payment Gateway value so the label/value cannot collide.
- Payment Success → Refresh Status now shows an active `Refreshing…` state, re-checks the saved payment result, and returns to `Refresh Status` when complete.

## Orders workspace

Orders are separated into five collapsible sections:

1. **New Orders** — paid Trial, Subscription and One-Time orders waiting for admin action.
2. **Pending Orders** — payment requests with no money received.
3. **Existing Orders / Subscribers** — paid orders already processed and ongoing customer records.
4. **Cancelled Orders** — unpaid/failed/abandoned payment requests.
5. **Cancelled Subscriptions** — subscriptions where money was previously received but the recurring subscription was later cancelled/ended.

Pending requests that still have no confirmed receipt after one hour are classified as cancelled on the next dashboard/orders refresh. Authenticated or paid subscriptions are excluded from this stale-pending rule.

Each order card has its own Help/Instructions control and Excel export. Payment-gateway identity is shown as a compact badge beneath the customer WhatsApp number instead of consuming another grid column.

The New Orders action selector is rendered outside the grid clipping area and supports wheel scrolling and scrollbar dragging. In Process remains in New Orders; Delivered/Completed moves the record to Existing Orders; cancelled/failed states move to their correct lifecycle bucket.

## Dashboard Payments Overview

Payments Overview now includes shortcuts/counts for Paid Orders, Pending Orders, Existing Orders, Cancelled Orders and Cancelled Subscriptions. Paid Orders means the current new paid work queue rather than every historical receipt. Total Orders opens the Orders page with all sections collapsed; each workflow card opens its corresponding section.
