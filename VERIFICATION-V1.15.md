# DropBeat Dance Studio V1.15 Verification

Verification date: 27 September 2026 (UTC)

## Automated verification completed

- All 49 SQL migrations applied in order to a clean SQLite database.
- Portal accounts, mandatory first-payment password setup and ticket tables/indexes verified.
- PBKDF2 hashing and verification tested at the Cloudflare-compatible 100,000 iteration limit.
- Null-safe refresh selectors checked in the admin compatibility layers.
- Three-mode Login / Student Sign Up / Coach Sign Up interface checked.
- Minimal student fields, 15 MB photo limit and removal of Founder / Co-Founder from public coach registration checked.
- Day/time/class-type/dance-style coach availability persistence checked.
- Collapsed Coach Account Status and admin ticket workspace checked.
- Google Drive routing checked for profile, banner, studio-gallery, page and brand image uploads.
- Paid-order account creation/linking, mandatory password setup and student dashboard redirect checked.
- Paid-student authenticated ticket creation checked.
- Track Order navigation removal and backward-compatible Student Dashboard redirect checked.
- Checkout/footer containment checked.
- Every JavaScript file under `public` and `functions` passed `node --check`.
- The complete historical DropBeat regression chain passed from V1.15 through V1.02 and the V17.09/V16 deployment, integrations, payment, CRM, analytics and automation checks.

## Commands used

```text
npm run test:dance-v1.15
find public functions -name '*.js' -type f -print0 | xargs -0 -n1 node --check
```

The npm `http-proxy` notice printed by the runner is a host-environment deprecation warning, not an application or test failure.

## Live credentials still controlled by the administrator

- Google Login requires a Google OAuth Web client and the portal callback URL.
- Google Drive uploads require a connected Drive account and destination root folder.
- Google Meet sessions require the existing Google Calendar / Meet integration.
- Admin email-change codes require an enabled provider under **Settings → Integrations → Email & OTP**. Google Meet does not send transactional email.
- Razorpay, Stripe or PhonePe still requires the site's own production credentials and webhooks.

