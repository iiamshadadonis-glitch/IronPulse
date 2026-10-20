# V16.92 release verification

Verified on 2026-09-12 against the supplied V16.91(2) complete replacement archive.

## Automated checks

- `npm run test:v16.92` — passed.
- V16.92 marketing, analytics, heat-map and webinar smoke checks — passed.
- V16.90 D1 read-path regression checks — passed.
- V16.89 period aggregation regression checks — passed.
- V16.88 data-integration regression checks — passed.
- JavaScript syntax check across 338 files in `functions`, `public/admin`, `public/assets` and `tests` — passed.
- Referenced local asset scan for the admin and payment pages — passed.
- HTML duplicate-ID scan across public HTML files — passed.
- `0039_v16_92_marketing_webinars.sql` applied twice to an in-memory SQLite database — passed; `PRAGMA integrity_check` returned `ok`.
- Original V16.91(2) input archive integrity — passed.

## Safeguards confirmed

- Existing D1 read-budget, cache, polling and migration-threshold logic was not modified.
- New advertising-provider report synchronization runs only when the admin presses **Sync Connected Platforms**.
- Optional analytics and advertising tags respect the matching consent choice.
- Purchase conversions require the existing payment result card to enter a confirmed success state; a success-looking URL alone is insufficient.
- Heat maps store bounded aggregate coordinates, element labels and durations; form values and keystrokes are not stored.
- Integration secrets are masked in admin responses.
- Campaigns remain drafts until the applicable provider credentials, permissions and assets are approved.
- Cross-platform funnel stages coordinate first-party audience intent and purchaser exclusion; provider auction delivery order is not represented as guaranteed.

## Deployment order

1. Deploy the complete V16.92 replacement.
2. Apply D1 migration `0039_v16_92_marketing_webinars.sql`.
3. Open Settings → Integrations → Marketing and Webinars, save the required credentials, and run each **Test Connection** action.
4. Configure an authenticated scheduled request to `/api/automation/webinar-reminders` using the existing automation secret.
5. Validate tags and conversion actions in the connected provider test tools before enabling paid campaigns.
