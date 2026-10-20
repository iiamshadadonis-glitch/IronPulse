# V1.27 verification

Run:

```bash
npm install
npm run test:dance-v1.27
```

The V1.27 regression test first recreates an existing V1.25 database carrying the old V1.26 schema marker. It verifies that the replacement code repairs the missing billing and order-item columns, then performs live in-memory checkout requests both without a coupon and with a 50% First Payment Only coupon.

The test also executes the actual Billing Length preview twice against a write-counting DOM fixture. A second unchanged render must perform zero writes, proving that the admin MutationObserver cannot retrigger itself. Static verification additionally requires the admin session timeout and V1.27 cache-busting URLs.

The command then runs the full V1.26, V1.25, V1.24, V1.23, V1.22, V1.21 and older regression chain.
