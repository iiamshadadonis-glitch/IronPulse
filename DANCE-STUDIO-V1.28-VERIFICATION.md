# V1.28 verification

Run:

```bash
npm install
npm run test:dance-v1.28
```

The V1.28 regression test recreates the production V1.26/V1.27 upgrade state and starts three schema checks concurrently. It verifies that the four checkout columns are added with a dedicated persistent marker in no more than 15 D1 operations. The actual verified count is 11; the faulty V1.27 path issued 1,023 operations in this same concurrent test.

The test then removes the optional portal marker and signs in through the public unified Login endpoint with a valid Admin account. It verifies a successful `/admin/` response in no more than eight D1 operations, confirms that Admin access did not initialize the portal schema, checks that portal-auth middleware bypasses the full application schema, and checks that private documents do not trigger public traffic maintenance.

The command then runs the complete V1.27, V1.26, V1.25, V1.24, V1.23, V1.22, V1.21 and older regression chain, including payment creation, Billing Length, First Payment Only coupons, Schedule Meeting, holidays, coach settings, attendance, images and theme behavior.
