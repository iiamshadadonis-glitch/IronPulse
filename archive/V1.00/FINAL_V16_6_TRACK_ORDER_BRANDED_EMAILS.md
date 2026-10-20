# V16.6 — Track Order + Branded Email Polish

This release is an additive update on top of V16.5. Existing payment gateway, tax, trial, checkout, CRM, invoice PDF, statement PDF, theme and admin workflows are retained.

## Track Your Order
- Retry Payment now restores to **Retry Payment** when the customer returns with the browser Back button.
- **Download Invoice** downloads from the Track Order page without visibly navigating to Payment Successful.
- Download button shows **Downloading…** and returns to **Download Invoice** after completion.
- A success/error message appears below the order grid after an invoice download attempt.
- Track Order workspace is wider with responsive padding.
- Grid now separates **Order Status** from **Payment Status**.
  - Order Status reflects admin workflow: In Progress, Delivered, Completed, Cancelled or Failed.
  - Payment Status reflects money state: Paid, Pending, Cancelled or Failed.

## Branded Emails
All customer emails sent through the website now use the saved Brand Settings where available:
- brand name
- tagline
- logo
- primary and accent colors
- footer text
- optional enabled Legal Entity name/address

Updated email types:
- Order OTP verification email
- Automatic successful-payment email
- Admin Send Invoice via Gmail
- Admin Send Payment Statement via Gmail
- Generic website email notices such as refund notifications

Subjects use ASCII-safe separators to prevent the previous garbled statement subject.

## Successful Payment Email
- Sent for confirmed payment receipts across the existing Razorpay, Stripe and PhonePe webhook/verification flows.
- Shows customer name, Order ID, plan/item, gateway, transaction reference, exact amount received and payment date.
- Includes a branded invoice PDF attachment.
- Payment-email deduplication is stored per real payment receipt, allowing future recurring charges to receive their own confirmation email instead of limiting email to one per order.

## Database
No manual SQL is required. The existing automatic schema process adds the two payment-receipt email tracking fields when needed.
