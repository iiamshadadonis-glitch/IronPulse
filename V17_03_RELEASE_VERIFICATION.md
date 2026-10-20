# V17.03 — visitor freshness and dashboard refresh

This is a complete replacement of V17.02. Deploy the project using the same Cloudflare Pages workflow used for previous releases; the replacement contains both the public files and the API Functions. No separate D1 migration command is required.

## Changes

- Visitor writes recover when an older D1 visitor table is missing optional analytics, IP, consent, or location columns. Only that error path inspects and repairs schema. If schema alteration is unavailable, a compatible legacy insert still stores the visit. Normal visits continue using one existing insert.
- The dashboard's visitor totals use the indexed latest visitor event ID to validate cached aggregates. New visitor activity invalidates only the visitor aggregate; unchanged traffic reuses it. The dashboard's other summary stays cached.
- The Dashboard Refresh button explicitly refreshes dashboard totals and the existing subscription overview; the Tracking Refresh Visitors button bypasses aggregate caching. Visitor and repeat visitor dialogs always read their current list from D1 and use no-store requests.
- The Pages expander shows plain “Show N more” and “Show fewer” labels, without the unwanted arrow. Null-safe DOM lookups protect the dynamic visitor dialog and Settings navigation from missing elements during refresh.
- Public tracking now logs a network or D1 failure in the browser console instead of failing silently; it also keeps a page-session visitor ID when browser storage is unavailable. Public and admin asset URLs use a new cache version.

## Verification

`npm run test:v17.03` covers the new visit against an older D1 schema, optional-column self-repair, legacy fallback, first-party IP field when available, fresh visitor/repeat lists, cache invalidation after a new visit, and dashboard visitor cards without rescanning orders. The inherited V17.02–V16.88 checks also pass. Changed JavaScript files passed `node --check`.

## Production check

After deploying, open a public page in a fresh browser, wait for the request to complete, and open Dashboard → Visitors. Its newest row should reflect the visit. Dashboard → Refresh updates the visitor count and other dashboard cards. If the visitor still does not appear, inspect the response to `/api/track/visit` and the Cloudflare Pages Function logs; this package cannot read the production D1 database or deployment logs from the local workspace. Previously missed visits cannot be recreated retroactively.
