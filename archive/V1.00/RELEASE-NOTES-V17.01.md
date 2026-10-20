# Urgent Casting V17.01 — D1 Read Reduction

## Orders

- Removed the two independent five-minute full Orders refresh loops.
- Added one revision-first watcher. Its normal poll reads only the single `orders` activity row.
- Full Orders data is now fetched only when Orders is opened, the administrator explicitly refreshes/searches, or an order/payment revision actually changes.
- Dashboard and navigation badges use `GET /api/admin/orders?summary=1`, which returns only bucket counts and record IDs.
- Removed duplicate Orders-summary requests from older Dashboard decorators; the final Orders controller is authoritative.
- Replaced the per-order payment, item, plan and subscription scalar subqueries with grouped CTEs joined once to the selected order set. Returned fields and order classification calculations are unchanged.
- Order creation, verified gateway callbacks, payment failure, administrative status changes and the abandoned-payment sweep now bump the existing tiny Orders revision row only when order state changes.

## Visitor analytics

- Total visitors, repeat visitors, page views, sources and page statistics share a five-minute module/edge snapshot across Dashboard and Tracking.
- The explicit Tracking/Visitors Refresh action bypasses the snapshot and recalculates immediately.
- Visitors and Repeat Visitors dialogs continue using `view=list`, so opening a modal does not calculate totals, sources or page statistics.
- The repeat-visitor count and visitor totals now come from one grouped statement instead of two complete-history scans.

## Indexes and compatibility

- Added idempotent lookup indexes for order items, manual payments, payment receipt status/latest lookups and subscription cache lookups.
- Indexes are created by the existing schema initializer. No manual D1 migration command is required.
- No database records, business calculations, visual theme, colors or user-facing workflows were removed or redesigned.
- Updated Admin asset query strings to `cache=17.01` so the optimized scripts replace cached V17.00 copies immediately after deployment.
