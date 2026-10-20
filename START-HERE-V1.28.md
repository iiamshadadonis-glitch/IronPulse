# DropBeat Dance Studio V1.28

This complete replacement package is built directly from the supplied V1.27 code. It repairs the Login, Cloudflare Worker resource-limit and missing public-content regression without changing existing colour themes or unrelated business logic.

## Deploy

1. Back up the current Cloudflare Pages project and D1 database.
2. On Windows, run `DEPLOY-V1.28-WINDOWS.bat`; on macOS/Linux, run `bash DEPLOY-V1.28-MAC-LINUX.sh`.
3. The helper installs dependencies, runs the complete V1.28-to-legacy regression chain, applies the existing additive migrations and publishes only after the tests pass.
4. When Cloudflare reports deployment complete, open `/login` in a private window and sign in normally. Do not delete or recreate the D1 database.

## Verify after deployment

- The Login button should leave **Signing in…** promptly and open `/admin/` for valid Admin credentials.
- Refresh `/login`; it should render normally without Cloudflare Error 1102.
- Open the home page and Offers page; hero/banner content and memberships/plans should load from the existing database.
- From Checkout, click Continue to Payment and confirm the existing payment page/link opens.
- In Sales → Plans & Offers, confirm V1.27 Billing Length remains available.

The first API request performs only the four-column checkout compatibility patch if it is needed. It does not replay the full legacy schema and does not remove or overwrite existing records.
