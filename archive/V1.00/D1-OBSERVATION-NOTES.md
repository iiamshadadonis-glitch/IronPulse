# D1 observation checkpoints

V16.90 keeps the existing database and topology. The Dashboard's repeated paid-customer exclusion work is consolidated into one equivalent lead-metrics query, identical Dashboard summaries are shared for 120 seconds at the edge after authentication, and background Request badge checks now fetch counts rather than up to 1,000 joined records. Explicit Admin workspace loads still fetch current rows.

V16.89 leaves database topology unchanged and creates no additional D1 database. It keeps the earlier polling safeguards and places the three public-traffic publishing fallback scans behind one shared 15-minute edge-cache lease. Scheduled automation endpoints and webhook delivery remain unchanged, while ordinary page views no longer repeat the same D1 maintenance scans.

| Supplied checkpoint | Rows read | Rows written | Queries |
|---|---:|---:|---:|
| 2026-09-04 19:03 IST | 1.28M | 3.74K | — |
| 2026-09-04 20:36 IST | 1.57M | 4.44K | — |
| 2026-09-04 22:44 IST | 1.70M | 4.82K | 51.64K shown in the database grid screenshot |
| 2026-09-05 00:37 IST | 2.02M | 5.93K | — |
| 2026-09-05 current supplied checkpoint | 339.13K | 1.81K | 21.8K |
| 2026-09-05 20:11 IST | 1.36M | 2.54K | 45.62K |
| 2026-09-06 12:15 IST | 2.79M | 1.02K | 57.97K |
| 2026-09-06 14:31 IST | 3.22M | 1.19K | 147.04K |
| 2026-09-06 16:15 IST | 3.82M | 1.28K | 148.94K |
| 2026-09-07 11:24 IST | 246.51K | 79 | 935 |
| 2026-09-16 supplied checkpoint | 5.16M | — | — |

V17.00 responds to the 16 September 5.16M checkpoint without slowing explicit Admin actions or creating another database. Public site, bootstrap, product and blog responses now use a two-minute Cloudflare Cache API entry whose key ignores browser cache-busting query strings. The visitor list/export request now skips the four analytics aggregation scans, and visitor/contact lookup indexes are created by the existing self-healing schema path. This release adds no migration command for the administrator to run.

The new cache is deliberately short. Public edits can be up to two minutes behind while repeated page views avoid reading the same D1 rows. A new deployment gets a V17.00 cache key, so it does not reuse the older release's cached payload. Visitor and repeat-visitor lists remain on-demand and are never background-polled by this change.

The 7 September checkpoint is the first supplied reading after the V16.90 read-reduction changes. At 11:24 IST it was at **246.51K rows read**, **79 rows written**, and **935 queries**. This is substantially below the 6 September checkpoints, but it is an early-day observation rather than a complete-day comparison. V16.91 therefore records the checkpoint without changing the D1 safeguards, polling intervals, cache freshness, database topology, or migration state.

From 14:31 to 16:15 IST, rows read increased by approximately **600,000 in 1 hour 44 minutes** (about **346,000 rows/hour**), while only about **1,900 additional queries** were shown (about **1,096 queries/hour**). That ratio indicates costly repeated scans rather than a sudden Telegram poll loop. Telegram remains webhook-driven. V16.90 therefore targets the repeated Dashboard identity scan and full Request-list badge reads rather than slowing Inbox, notification, or explicit Admin actions.

Between the two supplied 6 September checkpoints, rows read increased by approximately **430,000 in 2 hours 16 minutes** (about **189,700 rows/hour**) and queries increased by approximately **89,070** (about **39,300 queries/hour**). This is why V16.89 gates the public-traffic fallback scans. Telegram remains webhook-driven and does not add a Telegram polling loop.

Cloudflare's **Queries** figure is the number of SQL statements/queries executed against D1 during the metering period. It is not the same as rows read: one query can read zero, one, or many rows and can therefore contribute very differently to the rows-read total.

Official quota note recorded for the next comparison: the Free plan allowance is account-wide rather than multiplied per database. Up to 10 Free-plan databases may be created, each database is capped at 500 MB, total account storage is 5 GB, and the daily account allowances are 5 million rows read and 100,000 rows written. The daily allowances reset at 00:00 UTC (05:30 IST).
