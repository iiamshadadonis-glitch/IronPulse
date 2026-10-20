# DropBeat Dance Studio V1.00 — Release Verification

Verification date: 2026-09-24
Underlying compatibility baseline: Urgent Casting V17.09
Dance conversion layer: Dance Studio V1.00

## What was preserved
- Cloudflare Pages + Pages Functions architecture
- D1 data model and existing tested backend contracts
- Admin workflows, CRM, orders, payments, subscriptions, refunds, integrations, social tools, inbox/comments, email/OTP, automations, pages, banners, offers and D1 read protections
- Legacy internal IDs/routes/table names where renaming could break compatibility

## What was converted
- DropBeat Creative Dance Studio visual system applied to public site and admin
- Barlow font assets and DropBeat logo/page-title/texture assets from the supplied theme
- Default palette: primary `#4B55BE`, accent `#A469A8`
- Public wording converted from casting/audition/actor terminology to dance classes/students/dancers
- Admin-visible wording is converted by a non-destructive language layer while internal API/DB contracts remain unchanged
- Brand Settings colors dynamically feed the DropBeat public/admin CSS variables
- Plans & Offers seeded as online, studio, hybrid and private-coaching dance memberships
- Home banners, fallback plan artwork, PWA icons, invoices and branded emails converted to dance branding
- About, Contact, Privacy, Terms, Refund, FAQ and 404 page seeds added for dance-studio use
- Trial/profile surface converted to Book a Trial Class while preserving the existing backend route/fields
- Dance class sitemap alias added while retaining the legacy route for compatibility
- New D1 database/project identifiers separated from the Urgent Casting project

## Verification completed
- `npm run test:dance` — PASS
- Complete inherited V17.09 → V16.88 regression chain — PASS
- V17.01 D1 read-path optimization checks — PASS
- All 352 JavaScript files under `public/` and `functions/` parsed with `node --check` — PASS
- Fresh content-page seed SQL executed against SQLite — PASS
- `0001_initial.sql` + `0002_final_polish_pages.sql` + `0042_dance_studio_branding.sql` migration validation — PASS
- Static public HTML scan for Urgent Casting / Audition Updates / Submit Profile / actor/acting customer wording — 0 matches
- Admin shell scan for the same visible legacy wording — 0 matches
- Old Urgent Casting production D1 UUID in replacement package — 0 matches
- Old Urgent Casting brand palette values in presentation files — 0 matches

## Required deployment-specific value
`wrangler.jsonc` deliberately contains `REPLACE_WITH_NEW_DANCE_D1_DATABASE_ID`. Create a new D1 database for the dance site and replace this value before deployment. This prevents the dance website from accidentally writing to the existing Urgent Casting database.

See `DANCE-STUDIO-SETUP.md` for the deployment sequence.
