# DropBeat Dance Studio V1.26 release notes

## Included fixes

- Adds Billing Length to both Add New Plan / Offer and Edit Plan / Offer, with a dynamic price/frequency explanation and a red yearly-plan confirmation warning.
- Carries administrator-defined monthly or yearly intervals through the catalog, cart, checkout, automation checkout, order storage and payment-gateway request.
- Keeps pre-V1.26 plans on their existing behavior until they are edited and saved.
- Separates the first payment from the recurring renewal amount. A First Payment Only coupon affects the first charge only; an All Subscription Payments coupon continues to affect every renewal.
- Keeps the reduced first debit separate from the full future mandate amount for Razorpay, Stripe and PhonePe checkout paths.
- Sends PhonePe checkout payloads with the required POST method and verifies the first debit and future mandate amounts independently.
- Shows the regular price, website offer price and coupon price as a clear three-level price stack when all three differ.
- Keeps the existing paid-trial workflow intact.
- Reduces the shared sun/moon control to 30 px (28 px on small screens) and reserves admin header space so it cannot overlap Refresh/actions.

## Database

Migration `0055_dropbeat_billing_interval_first_payment_v1_26.sql` adds nullable plan billing length and additive order-item first-payment/renewal snapshot fields. No existing table or row is removed.
