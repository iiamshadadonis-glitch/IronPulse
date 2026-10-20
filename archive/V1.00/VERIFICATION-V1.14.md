# DropBeat Dance Studio V1.14 Verification

Verification date: 27 September 2026 (UTC)

## Automated coverage

- All 48 SQL migrations applied in sequence to a clean SQLite database.
- V1.14 database tables, indexes and linked coach fields verified.
- Unified navigation and Login wording checked across all static and dynamic public pages.
- Login, Student Sign Up, Coach Sign Up and Google OAuth wiring checked.
- Password hashing/verification and HTTP-only portal session cookie checked.
- Unpaid student pending state checked.
- Verified-payment student automatic approval checked.
- Coach application, admin approval and publication to the existing dance-coach table checked.
- Typed `REMOVE` protection checked.
- Approval, schedule-request, current-coach and past-coach admin UI checked.
- Real OTP email sender route and removal of setup-code/coding-access behavior checked.
- Student/coach dashboard scripts and every modified JavaScript module syntax checked.
- Full historical DropBeat regression chain executed from V1.14 through the existing V1.02/V17.09/V16 checks.

## Production integrations that require the administrator's credentials

The test suite verifies the integration code and failure diagnostics. A live Google consent/login, live Google Meet creation and live email delivery require the site's own Google OAuth and Email & OTP credentials, as described in `START-HERE-V1.14.md`.

