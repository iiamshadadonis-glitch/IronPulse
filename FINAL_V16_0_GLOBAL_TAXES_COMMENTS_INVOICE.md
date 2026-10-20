# Urgent Casting V16.0 — Global Taxes, Comment Replies & Invoice Polish

This build is an additive update on V15.9. Existing colors, navigation, payment-gateway selection and unrelated admin logic are preserved.

## Brand Settings — Taxes

- Added a final collapsible **Taxes** card below Admin Information Help.
- Added independent **Save Taxes** action.
- Added master **Enable Taxes** toggle.
- Added optional GST controls: Enable GST, editable percentage (12% software default), GST Number.
- Added optional Service Charge controls: fixed rupee value **or** percentage.
- Added optional Other Tax controls: customer-facing label and percentage.
- Added the existing themed information helper/back interaction with solution-oriented examples.
- Settings are stored with the existing Brand/Site Settings record.

## Global charge calculation

For newly-created payment requests:

1. GST is calculated on the discounted base amount.
2. A fixed Service Charge is added as entered; if a Service Charge percentage is used, this project calculates it on the GST amount when GST is enabled, otherwise on the base amount.
3. Other Tax percentage is calculated on the base amount.
4. The resulting customer-visible total is passed to the enabled gateway.

The calculation is applied to public checkout purchases, trial/setup charges, recurring subscription amounts, one-time payments, custom admin payment links/subscriptions and Client Details payment-link/QR generation.

Tax/charge snapshots are stored with the order/payment data so later invoices keep the values that applied when that payment was created. Existing already-authorised recurring subscriptions are not silently rewritten when the Brand Settings tax configuration changes.

## Checkout and payment display

- Product cards can indicate enabled GST/Service Charge/Other Tax.
- Checkout Order Summary shows applicable charge lines and the tax-inclusive amount due.
- Secure payment summary shows the tax-inclusive amount and tax breakdown where applicable.
- Payment receipts retain base amount, GST, Service Charge, Other Tax and saved tax configuration.

## Comments

- Replaced the misleading edit/pencil action with a universal Reply icon.
- Removed reply file upload.
- Added **Image URL Optional** with public HTTP/HTTPS validation.
- Added a horizontally scrollable emoji picker; choosing an emoji inserts it into the Admin Reply.
- Text, emoji and an optional image URL can be used together in a reply.

## Invoice polish

Trial invoice wording was simplified:

- Removed the future recurring amount/date line from Plan Details.
- Uses **Subscription Charge Not Collected** with **Excluded from this receipt**.
- Uses **Trial Charge Today** with **Initial trial**.
- Removed authentication wording from the invoice.
- Removed the trial-specific refund warning.
- Uses customer-friendly recurring-billing/cancellation wording.
- Shows GST/GSTIN and applicable charge rows when the paid receipt contains them.
- Amount Received remains the actual amount received, including applicable taxes/charges.
- Amount-in-words supports paise.

## Database

Migration added: `0023_global_taxes_comments_invoice.sql`

It adds durable tax snapshot fields to orders/order items and tax breakdown fields to `payment_receipts`. Runtime schema guards remain in place for normal automatic deployment behavior.
