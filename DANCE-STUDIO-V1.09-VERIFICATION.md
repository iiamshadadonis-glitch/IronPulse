# DropBeat Dance Studio V1.09 verification

Verification completed on 25 September 2026 (UTC).

## Automated checks

- `npm ci --ignore-scripts` — dependency versions installed from the supplied lockfile.
- `npm run test:dance-v1.09` — passed the complete DropBeat V1.09 → V1.02 and inherited application V17.09 → V16.88 regression chain.
- JavaScript syntax verification — every `.js` and `.mjs` file outside dependencies passed `node --check`.
- Cloudflare Pages Functions build — Wrangler 4.128.0 compiled the complete Functions worker successfully.
- Fresh local D1 verification — all 46 migrations, including `0046_dropbeat_coach_class_types_performance.sql`, applied successfully.
- Repeat local D1 verification — the second run reported **No migrations to apply**.

## V1.09 integration coverage

The focused V1.09 suite creates a fresh SQLite database from all migrations and verifies:

- coach class types and available days persist and are returned to the admin;
- public coach cards use a two-line collapsed biography, two initial specialty tags, equal-height card rules, See more/See less controls, and a maximum desktop page size of three;
- an unsupported class type is rejected for a plan and a manual class assignment;
- an unavailable weekday is rejected for a plan and a manual class assignment;
- class workspaces include only coaches who support that workspace;
- an active assignment prevents the coach's required type or weekday from being removed;
- an incompatible replacement coach is rejected and a compatible replacement safely receives active work;
- schema readiness is memoized after the successful probe;
- coach/admin cache refresh work does not block mutation responses;
- V1.09 admin/public assets and `v109` public-data cache keys are active.

The inherited suites additionally passed Student Stories persistence, Brand Settings responsiveness, plan and manual-payment class mapping, one-time access expiry, coach replacement continuity, calendars, session changes, memberships, plan badge contrast, DropBeat styling, frontend pages, authentication continuity, payments, subscriptions, CRM, integrations, automations, email/OTP, technical SEO, and deployment configuration.
