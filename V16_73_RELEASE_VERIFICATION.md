# V16.73 Release Verification

Build: **Urgent Casting V16.73 Complete Replacement**

## Scope verified

- SEO Connection appears as the first SEO integration.
- SEO Connection is removed/re-homed from API Settings.
- Google expired/revoked refresh-token failures are classified as `SEO_RECONNECT_REQUIRED`.
- Admin diagnostics explicitly direct the user to **Connect SEO** and Google reauthentication.
- Public Audition Updates can fall back to last synchronized published cache when the remote SEO source is temporarily unavailable.
- V16.72 D1 optimization behavior is retained.
- No CSS/theme file was modified.

## Automated verification completed

1. **JavaScript syntax:** 286 files passed `node --check`.
2. **Relative module imports:** 328 imports resolved successfully.
3. **Admin local asset/script references:** 151 references verified present.
4. **V16.73 static assertions:** passed for SEO ordering, SEO card relocation, typed reconnect diagnostics, public cache fallback, and final script ordering.
5. **CSS preservation:** 85 CSS files compared byte-for-byte by SHA-256 against the supplied V16.72 ZIP; all unchanged.
6. **Dynamic OAuth recovery test:** expired/revoked token produced `SEO_RECONNECT_REQUIRED`; duplicate reconnect state did not create another settings write.
7. **Dynamic valid OAuth test:** normal refresh-token path succeeded.
8. **Dynamic public fallback test:** remote SEO failure returned synchronized published cache with HTTP 200.

## Important verification boundary

These checks verify the replacement package locally and through mocked external OAuth/API responses. Live Google OAuth, Blogger availability and Cloudflare deployment behavior can only be confirmed after deploying the package to the user's actual environment.

## D1 comparison baseline

Recorded from the user's Cloudflare screenshot on 2026-09-03 around 12:40 IST:

- Rows read: 690.28K
- Rows written: 25.81K
- Queries: 42.71K
- Total storage: 12.46 MB
- Metered storage: 120.83 kB-mo
