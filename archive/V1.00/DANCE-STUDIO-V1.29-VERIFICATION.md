# DropBeat Dance Studio V1.29 verification

Verified on 12 October 2026 from the supplied V1.28 complete replacement.

## Result

`npm run test:dance-v1.29` passed in full. The command runs the new V1.29 checks first and then the complete inherited V1.28-to-base regression chain.

The verified V1.29 checks cover:

- stable first rendering of Plans & Offers without the delayed plan-row rewrite;
- bounded, mutation-safe Admin request deduplication and first-open prefetching;
- authoritative public navigation loading and immediate Site/Bootstrap cache invalidation after settings or navigation saves;
- Website Colors and Theme sub-tabs, four valid frontend theme choices, reset behavior, and conditional banner controls;
- V1.29 assets on all 26 complete public HTML documents and the Admin panel;
- complementary dark-mode coverage for public pages, Student/Coach portals, and Admin components;
- JavaScript syntax validation for every V1.29-modified runtime file; and
- byte-for-byte preservation of the critical V1.28 login, payment, checkout, schedule, remuneration, schema, and portal files.

The inherited chain also passed its login-resource, payment-link, coupon-renewal, billing-frequency, Schedule Meeting, attendance, holiday, portal, automation, database, deployment, and historical UI checks.

## Verification command

```bash
npm run test:dance-v1.29
```

The included Windows and macOS/Linux deployment helpers run this verification command before applying additive migrations and deploying.
