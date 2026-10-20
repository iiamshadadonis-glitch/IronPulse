# V1.26 verification

Run:

```bash
npm run test:dance-v1.26
```

The V1.26 suite applies all 55 migrations to a clean SQLite database and performs live in-memory checkout requests for both coupon scopes. It verifies:

- monthly and yearly Billing Length calculations, including custom intervals;
- exact plan price preservation for configured intervals and compatibility for legacy plans;
- the exact monthly example: ₹174.50 first payment and ₹349 monthly renewal for a ₹349 offer with a 50% First Payment Only coupon;
- recurring ₹174.50 for the equivalent All Subscription Payments coupon;
- Razorpay plan interval, renewal price, deferred start, first-payment add-on and remaining cycle count;
- PhonePe first-debit amount and full future mandate amount remain separate;
- checkout and payment-page three-level price presentation;
- paid-trial controls remain present and unchanged in their established path;
- compact colour-mode dimensions and admin action clearance;
- JavaScript syntax and the complete inherited V1.25 → V17.09 regression chain.
