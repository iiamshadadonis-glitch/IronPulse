# V16.75 Release Verification

Verification date: 2026-09-03 (UTC)

## Automated verification

- All JavaScript files under `functions/` and `public/`: `node --check` passed.
- Cloudflare Pages Functions: Wrangler 4.128.0 production bundle compiled successfully.
- V16.75 D1 migration: applied to an isolated SQLite database with representative `contact_leads` and `social_posts` base tables; required tables, poll column, repeat controls and cycle log column were verified.
- Release archive: verified separately with `unzip -t` after packaging.

## Implementation checks

- Provider-hosted documents use authenticated streaming and no-store response headers.
- D1 raw Inbox payload sanitization removes binary/base64/blob/byte fields.
- Existing DM and Comments channels remain available.
- Comment-to-DM uses a separate `comment_dm` channel and event-deduplication key.
- Lead creation immediately enrolls and runs due zero-delay steps; later steps are processed by the exact automation endpoint or the background traffic sweep.
- Daily nurture repetition uses a delivery cycle number so each repeated send retains its own receipt.
- Purchase stopping ignores an unpaid order ID and checks confirmed lead/order payment states.
- Poll delivery is capability-aware; unsupported targets publish the unmodified non-poll post.
- Existing theme variables remain authoritative; V16.75 CSS adds layout rules only.
