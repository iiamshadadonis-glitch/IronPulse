# Urgent Casting V16.9 — Trial Display, Automatic Payment Emails & Recovery

This build is based on V16.8 and keeps the existing theme and payment/business logic intact. The changes are additive/minimal fixes around payment display, automatic email delivery, invoice rendering and failed-payment recovery.

## Fixed

1. **Trial payment page amount**
   - Admin-created/custom subscriptions with a paid trial now use the saved order-item trial/setup amount as the source of truth for **Pay Today**.
   - Example: recurring charge ₹100 + trial today ₹1 => the Urgent Casting payment page shows ₹1 while Razorpay still keeps ₹100 as the later recurring mandate amount.

2. **Automatic success email for every confirmed payment**
   - Website checkout, admin-generated payment/subscription links, retries and supported gateway webhook flows all converge on the same `sendOrderPaidEmail()` routine.
   - A fallback on the payment-result endpoint sends the message if a confirmed receipt exists but the gateway webhook/verification path did not already send it.
   - `payment_receipts.email_notice_sent` prevents duplicate successful-payment emails.

3. **Automatic invoice attachment redesigned**
   - The server-generated PDF used by automatic Gmail messages now follows the existing Urgent Casting invoice design much more closely: branding, logo, invoice/payment metadata, plan details, payment summary, trial handling, notes/terms, amount in words, balance due and thank-you footer.
   - Existing browser/admin invoice-generation logic is not replaced.

4. **Failed-payment email recovery**
   - A newly failed attempt immediately sends a branded retry email.
   - If still unpaid, reminder 2 becomes eligible after 48 hours and is scheduled inside the 9:00 PM–10:30 PM India window.
   - Reminder 3 becomes eligible 24 hours after reminder 2 and is also scheduled inside that evening window.
   - If a new attempt fails, the sequence starts again from the immediate message.
   - Any confirmed successful payment resolves the recovery sequence immediately.
   - If all three messages are ignored, the sequence closes after the final reminder.

5. **Fresh retry link**
   - Retry email links are signed and prepare a fresh checkout from the currently active product/offer/trial configuration instead of reopening an expired gateway link.

## New endpoints

- `POST /api/payment-failure` — records a browser payment failure and sends the immediate retry email.
- `POST /api/public-retry` — validates a signed retry link and prepares the current checkout/cart.
- `POST /api/automation/payment-reminders` — processes due reminder 2 / reminder 3 emails. This endpoint uses the existing automation authorization protection.

## Important deployment note for reminder 2 and reminder 3

The immediate failure email is event-driven and requires no scheduler. The delayed 48-hour / 24-hour reminders need the following endpoint invoked periodically (recommended: every 15 minutes):

`POST https://urgent-casting.com/api/automation/payment-reminders`

Use the same authorization method already used by the project's automation endpoints (`AUTOMATION_API_KEY`). A Cloudflare Worker Cron Trigger, external scheduler, or other trusted scheduler can call it. Do not expose the automation key in browser code.

## Validation performed

- All JavaScript files under `functions/` and `public/` passed `node --check`.
- ZIP integrity is checked before delivery.
- Existing color theme and admin layout are preserved.
