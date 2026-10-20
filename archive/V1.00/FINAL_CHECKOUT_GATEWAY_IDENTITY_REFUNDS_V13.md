# Urgent Casting — Final Checkout, Gateway Identity & Refunds V13

This V13 build is an additive update to the supplied V12 project. Existing order, checkout, CRM, subscription, request, document, tracking, admin-help, branding and gateway architecture is retained unless a small compatibility change was required for the items below.

## Included changes

- Checkout now requires Name, WhatsApp Number and Email before payment-link/subscription creation. City and Preferred Role remain optional. The API validates the same requirements server-side.
- Razorpay recurring checkout now uses the existing local checkout identity with Razorpay Standard Checkout and the created `subscription_id`, rather than sending the customer through the hosted Subscription Link contact-details screen. Name, email and contact are prefilled and protected in the Razorpay checkout options.
- Stripe recurring checkout creates/reuses a Stripe Customer for the current checkout session so supported customer identity can be prefilled by Stripe Checkout.
- PhonePe keeps its documented checkout/AutoPay behavior. Existing known customer fields are passed only where the provider supports them.
- Gateway-only subscription rows are enriched with customer identity from Razorpay/Stripe/PhonePe responses when available. Local CRM identity remains primary; different gateway names, phones and emails are stored as source-labelled candidate values instead of silently overwriting the client.
- Alternate gateway phone/email values remain searchable through the existing CRM search. Exact phone/email matches can attach gateway activity to an existing lead/client; name alone is not used for automatic merging.
- Razorpay integration help now includes webhook setup guidance and the subscription/payment events needed by this project.
- API, webhook, Gmail callback and social-integration URLs are generated from the current site origin instead of a hardcoded `*.pages.dev` host. Optional `PUBLIC_SITE_URL` can override this when deliberately configured.
- New unpaid Razorpay subscription links expire after 24 hours. Stripe subscription Checkout Sessions expire within 24 hours. PhonePe uses the provider-supported AutoPay checkout expiration already configured by the project. Paid/successful orders are not modified by the unpaid-expiry cleanup.
- Payments Overview cards now work as order shortcuts.
- Orders tables use a cleaner layout: no separate phone column, phone is beneath the customer name, email is omitted, order/action widths are improved, and New Order Save is below the status selector.
- Client Details now has a Refunds tab that reuses the existing refund API, supports amount/reason review, and requires a second confirmation before submitting a refund.
- Client Details action-button red glow/shadow is removed.
- Public Requests no longer offers Cancel Subscription. The request choices are Pause Subscription, Restart Subscription, Invoice, Payment Statement and Payment / Subscription Support. The customer-facing guidance now explains review and a typical 72-working-hour handling window without referring to the admin dashboard.

## Deployment checks

After deploying the complete project:

1. Open `/checkout`, add a plan and confirm Email is mandatory together with Name and WhatsApp.
2. Create a Razorpay test subscription. The site should open `/payment?...`, then Razorpay Standard Checkout should receive the saved contact details and proceed to payment options without asking the customer to retype them where Razorpay permits the hidden/prefilled fields.
3. In Admin → Dashboard → Subscriptions Overview, apply/refresh and verify gateway customer names/phones populate where the provider returns them.
4. In Edit Client, verify a differing gateway identity appears as a source-labelled candidate rather than overwriting the local primary identity.
5. Open Admin from the custom production hostname and verify Payments, Social Media and API Settings show that hostname in generated webhook/API URLs.
6. Review Orders on desktop and narrow screens and verify the compact columns and horizontal overflow behave cleanly.
7. Open a Client → Refunds and test against a gateway test transaction before using a live refund.
8. Open `/requests` and verify Cancel Subscription is absent and the new customer guidance is shown.

## Validation performed before packaging

- All JavaScript files under `functions/` and `public/` passed `node --check`.
- Referenced local assets for the Admin, Checkout, Payment and Requests pages were checked for missing files.
- V13 admin CSS/JS is loaded once.
- No hardcoded `urgent-casting.pages.dev` remains in executable files under `public/` or `functions/`.

Live Razorpay, Stripe and PhonePe transactions were not executed from this build environment. Use the providers' test/sandbox modes for the first end-to-end deployment test.
