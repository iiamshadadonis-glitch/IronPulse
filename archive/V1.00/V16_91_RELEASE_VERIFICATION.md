# V16.91 release verification

The release gate validates the following:

- positive-only Business Ops badges and complete zero-shell removal;
- cache-busted V16.91 admin assets;
- viewport-fixed, above-or-below chart tooltip placement;
- collision-safe outside pie labels with reserved period-heading space;
- retention of V16.90 D1 read reductions and period aggregation behavior;
- the 7 September D1 checkpoint and explicit no-D1-change statement;
- JavaScript syntax across Admin and Functions;
- ZIP integrity and current release tests from a fresh extraction.

## Verified results

- `V16.91 smoke checks passed.`
- `V16.90 D1 read-path checks passed.`
- `V16.89 period aggregation checks passed.`
- `V16.88 data integration checks passed.`
- Every JavaScript file under `public/admin` and `functions` passed `node --check`.
- Every test module passed JavaScript syntax validation.
- The final ZIP passed archive-integrity testing.
- The four current-release tests passed again from a fresh extraction of the final ZIP.
