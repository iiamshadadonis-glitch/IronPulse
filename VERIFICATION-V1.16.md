# DropBeat Dance Studio V1.16 Verification

Verification date: 27 September 2026 (UTC)

## Verified successfully

- All 50 SQL migrations applied in order to a clean SQLite database.
- The V1.16 attendance, private-review and membership-discount schema and indexes were verified.
- Compact three-mode account access, country codes, one-box time fields, one class type, multiple dance styles and Add More Sessions were checked.
- Student Settings tabs and typed login-change confirmation were checked.
- Student dashboard Join Session, Add More Sessions, first-plan display, memberships, plan checkout, payment CSV, tickets and reviews were checked.
- Student/coach attendance reporting, Calendar/List modes, Present/Absent rosters, detailed student view and anonymous coach review behavior were checked.
- Member-only discount configuration, authenticated validation and final-order enforcement were tested; an unauthenticated visitor was rejected.
- Detailed student approval and typed `APPROVE` confirmation were checked.
- Refresh-safe selectors and delayed Attendance navigation placement were checked.
- Every changed JavaScript file passed the Node syntax checker.
- The full historical DropBeat regression chain passed through all retained dance-site, deployment, integration, payment, CRM, analytics and automation checks.

## Commands used

```text
npm run test:dance-v1.16
node --check public/admin/dropbeat-admin-v1-16.js
node --check public/assets/portal-auth-v1-16.js
node --check public/assets/portal-dashboard-v1-16.js
node --check functions/_lib/portal-attendance.js
node --check functions/api/admin/attendance.js
```

The npm `http-proxy` notice printed by the test runner is a host-environment deprecation notice, not an application or test failure.

## Live services controlled by the administrator

- Google Login requires the site's Google OAuth Web client.
- Google Meet requires the site's connected Google Calendar/Meet account.
- Google Drive uploads require the connected Drive account and destination folder.
- Verification email requires an enabled Email & OTP provider.
- Live payments require the site's own Razorpay, Stripe or PhonePe credentials and webhooks.
