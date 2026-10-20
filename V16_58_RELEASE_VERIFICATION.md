# V16.58 Release Verification

## Scope
V16.58 is a narrow admin-login responsiveness hotfix on top of the exact V16.57 replacement package supplied by the user.

## Root-cause verification
A full inline-browser regression harness using the complete V16.57 admin HTML/script stack reproduced the reported problem:
- DOM loaded normally.
- After the V16.57 compatibility scripts initialized, the email field could no longer be clicked within the test timeout.
- No JavaScript exception was required to trigger the failure; the browser main thread was starved by repeated DOM mutation work.

The V16.57 Inbox navigation helper rewrote the Inbox navigation button's `innerHTML` from inside a `MutationObserver` path. Rebuilding that observed subtree could trigger another mutation callback and create a self-sustaining update cycle in the full admin script stack.

## V16.58 correction
- Inbox navigation DOM is now built only when missing/old instead of being rewritten on every observer callback.
- The existing unread badge node is preserved.
- The Inbox heading write is idempotent.
- Admin `index.html` cache-busts the corrected script with `?v=16.58`.
- Authentication/backend/database/theme/business logic was not changed.

## Browser regression results
Using Chromium against the complete inline admin script stack:
- Exact V16.57 baseline: **FAIL reproduced** — login email field became unresponsive.
- V16.58: **PASS** after waiting beyond all relevant compatibility timers (5.2 seconds).
- Email field: clickable and editable.
- Password field: clickable and editable.
- Google sign-in button: clickable.
- Login button: clickable; mocked 401 response rendered normally and fields remained interactive afterward.
- Inbox navigation count: exactly 1.
- Posts navigation count: exactly 1.
- Browser page errors during hotfix test: 0.

## Static/package checks
- 263 JavaScript files: syntax PASS.
- 156/156 Cloudflare Function modules: import/load PASS.
- 25 HTML files: parser PASS.
- 74 CSS files: structural brace PASS.
- JSON / wrangler JSONC parse: PASS.
- 647 local static-file references: 0 missing.
- `functions/`: byte-identical to V16.57.
- `migrations/`: byte-identical to V16.57.
- No D1 migration required.

The final ZIP is re-extracted and compared byte-for-byte with the tested working tree before release.
