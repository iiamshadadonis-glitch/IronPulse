# V16.5 — Order OTP, Email Verification & Retry Workflow

This is an additive update on V16.4. Existing website colors, payment creation, tax calculation, invoices, CRM matching, order processing and subscription logic remain in place unless explicitly noted below.

## 1. WhatsApp OTP provider clarity

Settings → Social Media → WhatsApp Webhook & Order OTP now keeps the OTP Provider in one clear block.

- GreenAPI selected: only GreenAPI Instance ID and GreenAPI Token are shown.
- WhatsApp Cloud API selected: only WhatsApp Phone Number ID and WhatsApp Cloud Token are shown.
- Provider-specific fields are arranged side-by-side on desktop and stack on smaller screens.
- Added Enable WhatsApp OTP.
- Added Connect selected provider, Save WhatsApp OTP, Disconnect selected provider and Clear Form controls.
- Disconnect removes only the selected provider's saved credentials and turns WhatsApp OTP off.
- Clear Form clears the currently visible browser fields without silently deleting saved credentials.
- The existing webhook URL and verify-token workflow remains available.

## 2. Gmail OTP as a separate feature

The existing Gmail document sender remains unchanged for invoices/statements. A second independent toggle, Enable Gmail OTP, is added to the Gmail card.

- Gmail Sending controls invoices/statements.
- Gmail OTP controls Track Order verification codes.
- Enabling Gmail OTP disables WhatsApp OTP only.
- Enabling WhatsApp OTP disables Gmail OTP only.
- Gmail document sending is never disabled by switching the OTP channel.
- Gmail OTP uses the same connected Gmail OAuth account and existing gmail.send permission.

## 3. Track Order uses the enabled verification method

The public Track Order page reads the current admin OTP setting before rendering the form.

- Gmail OTP enabled: the customer sees Email ID.
- WhatsApp OTP enabled: the customer sees WhatsApp Number.
- Neither enabled: the page gives a solution-oriented Contact message instead of presenting a broken OTP flow.
- Send OTP changes to Sending OTP… while the request runs.
- Verify & View Orders changes to Verifying… while verification runs.
- Successful requests show a clear confirmation message.
- OTPs remain 6 digits, valid for 10 minutes, rate-limited and tied to an order account.
- A generic success response is retained when no matching account exists so the public endpoint does not disclose whether an email/phone is registered.

No D1 table migration is required. Email verification reuses the existing OTP challenge/customer-session tables with an email-prefixed identity key.

## 4. Order actions for customers

After verification, Track Order now provides useful actions based on the order state.

- Successful/received payments: Download Invoice.
- Expired/failed/cancelled orders: Retry Payment.
- All orders: Contact Admin.

Download Invoice uses the existing payment-success invoice generator and the actual successful payment reference.

## 5. Retry Payment no longer opens an expired gateway link

Retry Payment now prepares a fresh checkout instead of reopening the old payment/subscription URL.

The server verifies ownership of the selected order, reads its products, and rebuilds the cart from the current active plan/variant. This means current offer price, current trial configuration and the current checkout tax/charge settings are applied by the normal checkout/payment flow.

The customer is redirected to Checkout with the available saved details prefilled:

- Name
- WhatsApp / phone number
- Email
- City
- Preferred role

The customer reviews the current order summary and clicks Continue to Payment. Existing gateway creation logic then creates a new payment/subscription request.

## 6. Contact prefill

Contact Admin from Track Order opens Contact with the verified order's saved name, phone and email prefilled. The message remains blank for the customer to type.

## 7. Mobile number keypad

Public phone/mobile/WhatsApp fields now request the device numeric/tel keypad where applicable while retaining existing validation logic.

## 8. Files added/updated

New backend endpoints:

- `functions/api/public/order-otp-settings.js`
- `functions/api/my-orders-retry.js`

Updated backend:

- `functions/_lib/utils.js`
- `functions/api/auth/request-otp.js`
- `functions/api/auth/verify-otp.js`
- `functions/api/my-orders.js`
- `functions/api/admin/social-integrations.js`
- `functions/api/admin/gmail-auth.js`

New admin add-ons:

- `public/admin/final-v16-5-order-otp-providers.js`
- `public/admin/final-v16-5-order-otp-providers.css`

New public add-ons:

- `public/assets/final-v16-5-order-otp-retry.js`
- `public/assets/final-v16-5-order-otp-retry.css`

## 9. Deployment/testing

Replace V16.4 with the complete V16.5 package while keeping the existing `.git` folder and Cloudflare environment/bindings unchanged.

Recommended quick tests after deployment:

1. Select GreenAPI and confirm only its two provider fields appear.
2. Select WhatsApp Cloud API and confirm only its two provider fields appear.
3. Enable Gmail OTP and confirm WhatsApp OTP turns off while Gmail Sending stays unchanged.
4. Request an OTP from Track Order using an email already present on an order.
5. Verify the code and confirm orders load.
6. Use Retry Payment on an expired order and confirm Checkout opens with the current plan and saved customer details.
7. Use Download Invoice on a paid order.
8. Test a WhatsApp/phone field on mobile and confirm the numeric keypad opens.
