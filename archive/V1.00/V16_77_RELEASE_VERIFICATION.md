# V16.77 Release Verification

Verification date: 2026-09-04 (UTC)

## Completed checks

- `npm run test:v16.76` — PASS
- `npm run test:v16.77` — PASS
- `node --check` for every JavaScript file under `functions/` and `public/` — PASS (292 files)
- esbuild bundle verification for every Cloudflare Function module — PASS (169 modules)
- V16.77 CSS brace/structure validation — PASS
- Static DOM/CSS contract checks for fixed Client Details regions, contained tab scrolling, dashboard headers and subscription/visitor column headers — PASS
- Admin HTML asset-reference existence check — PASS
- `unzip -t`, archive file-count comparison and SHA-256 generation — completed after packaging

## Preservation contract

- V16.76 D1 read guard, public middleware and migration must remain byte-identical.
- No color-theme variable or existing automation/payment/poll behavior is replaced.
- V16.77 must add no migration.
- The final ZIP must contain one top-level replacement directory and no temporary/cache files.

## Preserved V16.76 D1 files

- `functions/_lib/d1-read-budget.js`: `5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43`
- `functions/_middleware.js`: `d62861781ad8188e591c025ca428749049dce6a76e517b8a08da8ac46f428126`
- `migrations/0036_v16_76_d1_read_guard.sql`: `f53e85c2364758e5b6906aed8b620d3b46260fb70a95c28fad0a0c6d152e8bc8`

## Observation baseline retained

- Rows read before deploying V16.76: **860.6K**
- Rows written before deploying V16.76: **1.73K**
- V16.77 introduces no D1 migration and does not modify the V16.76 read-budget controls.
