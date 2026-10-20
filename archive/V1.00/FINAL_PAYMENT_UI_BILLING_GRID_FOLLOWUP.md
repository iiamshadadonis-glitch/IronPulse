# Urgent Casting – Payment UI / Billing Helper / Grid Follow-up

This package is based on the supplied V2 project and keeps the existing application logic in place. The current follow-up is implemented as a final additive admin UI layer plus small targeted PhonePe backend corrections.

## Payments UI

- Restores the earlier clean collapsible Payment Integration layout.
- Removes the large Primary-gateway selector cards and gateway-order banner.
- Does not include a global disable-all switch; gateway choice remains per gateway.
- Keeps Razorpay, PhonePe and Stripe sections collapsed by default. WhatsApp/OTP is configured under Settings → Social Media.
- Uses individual Save buttons for Razorpay, PhonePe and Stripe.
- Only one main gateway switch can be Primary at a time.
- With Razorpay Primary, PhonePe fallback is tried before Stripe fallback.
- PhonePe fields include concise helper text and HMAC/SHA webhook-mode selection.

## PhonePe subscriptions

- The existing default schedule (1 month × 252 cycles = 21 years) is retained.
- Custom month intervals can use PhonePe ON_DEMAND while Urgent Casting retains the intended due-date schedule.
- A PhonePe subscription is not silently shortened to 30 years anymore.
- Plans above PhonePe's supported 30-year expiry, recurring amounts above the configured PhonePe AutoPay limit, or this project's unsupported separate setup amount are shown to the admin before link generation when PhonePe is Primary.

## Live billing-cycle explanation

The New Subscription page and both subscription forms inside Client Details → Generate Payment now update the Total Billing Cycles helper immediately, for example:

`Billing frequency: every 3 months × 5 billing cycles = 1 year 3 months.`

## Storage

- Replaces the front-card dot with the universal information `i` control.
- Keeps the existing flip-card behaviour unchanged.
- Makes the available-storage badge a capsule while retaining its live percentage.

## Subscription detail modals

- Keeps horizontal scrolling.
- Increases the table/grid width and assigns explicit column space so headers such as Payment Type, Total Charges, Remaining and Attempts / Note do not collide.
- Header labels stay on one line; long row content can wrap and automatically increases that row's height.
