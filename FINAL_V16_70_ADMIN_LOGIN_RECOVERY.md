# V16.70 — Admin Login Recovery / Auth Schema Isolation

## Problem
The Admin login UI could display only `Login failed` when the `/api/admin/auth/login` request was interrupted by a full application schema bootstrap/repair error. The root middleware ran the entire application schema before every API route, including login. An unrelated optional table/index migration could therefore make authentication unreachable even though the existing admin user and password were still valid.

## Fix
- Added a small self-healing authentication schema containing only `settings`, `admin_users`, `admin_sessions`, and `admin_email_change_requests`.
- Admin authentication routes use the lightweight auth schema instead of depending on the full application schema migration.
- Full application schema-maintenance failures no longer create a site-wide API blockade on an existing production database; the requested endpoint can return its own precise table/error message.
- Login now always returns JSON for unexpected server/database errors instead of leaking a generic Cloudflare HTML 500 response to the login UI.
- Login UI now requests JSON explicitly, verifies the newly issued session, and shows a precise error instead of the ambiguous `Login failed` message.
- Existing passwords, admin users, sessions, D1 data, UI theme, social integrations and automation logic are not reset or replaced.
