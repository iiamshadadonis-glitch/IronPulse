# V16.70 Release Verification

## Scope
V16.70 is a minimal Admin authentication reliability update built on the uploaded V16.69 complete replacement. Existing business logic, integrations, automation flows, theme, passwords and D1 data are preserved.

## Root cause addressed
Admin authentication requests previously passed through the entire application `ensureSchema()` routine before reaching `/api/admin/auth/login`. If an unrelated schema/bootstrap statement failed in a cold Cloudflare Pages Functions isolate, Cloudflare could return an HTML 500 response before the login handler ran. The browser could only display the generic `Login failed` message even though the admin credentials themselves had not necessarily changed.

## Fixes
- Added a lightweight self-healing auth schema for `settings`, `admin_users`, `admin_sessions` and `admin_email_change_requests`.
- `/api/admin/auth/*` no longer depends on successful completion of every unrelated application schema repair.
- Login explicitly prepares the auth tables before reading the admin user.
- Unexpected login/database exceptions are returned as JSON with a useful message instead of becoming a generic HTML 500 page.
- Login verifies the newly-created session after authentication.
- Existing saved admin password hashes are preserved; no reset or credential migration is performed.
- Expired admin sessions are cleaned opportunistically without blocking authentication.
- Core `admin.js` is cache-busted to V16.70.

## Verification
- 281 JavaScript files parsed with `node --check`: 0 syntax errors.
- 316 relative JavaScript imports checked: 0 missing.
- 144 local Admin JS/CSS references checked: 0 missing.
- SQLite/D1-compatible functional auth test passed:
  - fresh auth tables self-create;
  - valid admin login returns 200 and a session cookie;
  - `/auth/me` verifies the new session;
  - an existing changed password remains valid after the auth bootstrap;
  - an incorrect password remains rejected with 401.
- Simulated D1/schema failure returns JSON diagnostic response instead of generic HTML `Login failed`.
- Compared with uploaded V16.69: 0 existing files removed.
