# V17.01 Release Verification

## Automated verification

- `npm run test:v17.01` — passed, including every inherited V16.88–V17.00 regression test.
- JavaScript syntax validation across all Functions and Admin JavaScript files — passed.
- The consolidated Orders query returns the same paid trial, recurring amount, manual payment and workflow bucket results in the SQLite integration fixture.
- `EXPLAIN QUERY PLAN` confirms that the Orders query contains no correlated scalar subquery over supporting payment/item/subscription tables.
- Two stacked Orders summary requests reuse the short server memo instead of repeating the D1 summary query.
- A repeated visitor analytics request reuses the five-minute aggregate snapshot and executes only the requested visitor-list query.
- Static polling checks confirm one Orders revision watcher and no legacy five-minute full Orders refresh timer.
- Static Dashboard checks confirm older decorators no longer request Orders data.

## Deployment

- No migration file is added and `npm run d1:migrate:remote` is not required for V17.01.
- Deploy the complete replacement package using the same Cloudflare Pages replacement/deployment method already used for the website.
- The existing idempotent schema initializer creates the new supporting indexes automatically.
