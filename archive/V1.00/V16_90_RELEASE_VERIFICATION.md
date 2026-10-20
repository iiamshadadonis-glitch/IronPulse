# V16.90 release verification

The release gate verifies:

- V16.90 asset cache-busting and version metadata;
- horizontal charts use period buckets and exact per-bucket counts/amounts;
- pie charts render per-period buckets, including explicit no-activity periods;
- chart paging preserves long comparisons without combining periods;
- business pie totals separate net received, failed/cancelled value, and refunds;
- one contextual mode Help & Instructions control replaces the three outside controls;
- zero Business Ops badges are blank and hidden;
- Dashboard paid-customer matching is consolidated into one lead-metrics statement and identical summaries use a short shared edge cache;
- Request notification checks use the count-only endpoint and full workspace loads no longer trigger duplicate decorator fetches;
- all prior period aggregation and data-integration tests still pass.

Run:

```bash
npm run test:v16.90
```

The final ZIP is syntax-checked, tested, integrity-checked, extracted into a fresh temporary directory, and tested again from the extracted copy before delivery.
