# DropBeat Dance Studio V1.02 – verification record

## Completed checks

- Focused V1.02 regression test: passed, including real simplified trial submission against a fresh in-memory schema.
- Complete inherited dance/V17.09 regression chain: passed through V16.88.
- Dance conversion test: passed.
- Cloudflare Pages deployment configuration and static asset-reference test: passed.
- JavaScript syntax validation: passed for 392 files.
- Cloudflare Functions module graph import: passed for 204 modules.
- Fresh database initialization: passed for all 42 migrations, producing 64 application tables.
- Corrected fresh-database Instautomate footer seed: passed.
- HTML parsing: passed for 24 full documents; one comment-only helper partial was intentionally skipped.
- CSS structural balance: passed for both replacement theme stylesheets.
- Key text/background contrast checks: passed with a minimum ratio of 6.28:1.
- Local HTTP smoke test: passed for home, offers, trial form, admin login, both replacement stylesheets and the supplied theme image.
- Static frontend coverage: all 23 customer-facing HTML pages load `dropbeat-theme.css?v=1.02` and contain the corrected Instautomate design credit.
- Admin cascade check: `dropbeat-admin-theme.css?v=1.02` loads after all inherited admin styles and scripts.

## Admin failure paths verified

- Missing optional marketing panels no longer cause `querySelector` to run on `null`.
- Email provider integration does not load while the login overlay is active.
- Wrapped order/business loaders do not call protected APIs while the login overlay is active.
- Successful authentication triggers deferred initialization through `dropbeat:admin-ready`.
- Expected pre-login authorization responses are excluded from global error toasts.

## Trial form verification

Accepted fields: `name`, `date_of_birth`, `gender`, `country_code`, `phone`, `email`, `profile_message`.

Removed public fields: `instagram_id`, `current_occupation`, `experience_level`, `projects_count`, `future_goal`, `role_interest`, photo links and video links.

The endpoint accepted a valid trial request without any removed fields, stored the date of birth, derived age and profile message, and rejected a future date of birth.

## Test command

```bash
npm run test:dance-v1.02
```
