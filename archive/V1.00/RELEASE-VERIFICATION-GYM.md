# IronPulse Gym V1.00 — release verification

Baseline: attached DropBeat V1.59. Verification date: 20 October 2026.

## Results

| Check | Result |
|---|---|
| Original V1.59 baseline suite before refactoring | Passed |
| Current gym release and backend regression suites | 31/31 passed |
| Cloudflare Pages Functions/Worker build | Compiled successfully |
| Runtime JavaScript syntax | 504 scripts parsed |
| Public/Admin HTML and local asset references | 27 pages passed |
| Existing CSS/theme files | All 177 byte-identical to V1.59 |
| Runtime schema definitions | All 268 file fingerprints identical |
| Original migration DDL | All 55 sets identical |
| API endpoint file paths | All 183 identical |
| Backend structure, keys, account roles and enums | 265 modules unchanged; 3 small routing/authentication adjustments tested separately |
| Fresh local Cloudflare D1 | All 56 migrations applied |
| Real local Cloudflare runtime | 6 groups passed |
| Browser workflows | 10 groups passed; no JavaScript page errors |
| Dynamic-name frame samples | 445 sampled frames; only the expected configured labels appeared |
| PWA assets | Correct 192/512px icons, maskable variants, 180px Apple icon and branded manifests |

## Scope of changes

- Gym-facing names, descriptions, placeholders, helper copy, messages, default memberships and fitness specialties are compiled into the source.
- Menu/button components use the existing dynamic stores. Loading/error states remain skeletons; failures offer Retry. Legacy text-replacement observers no longer rewrite menu names after rendering.
- New fitness photographs, gym logo, icons, program thumbnails and neutral avatar replace the dance artwork. Existing asset aliases remain compatible.
- `/member-dashboard` is the member route. Original student URLs redirect and retain query parameters. Stored roles and keys such as `student`, `student_id`, `dance_styles_json` and `dance_coaches` remain unchanged.
- Notification destination checks understand the new member route. Session restoration retains the stored student role while opening the new path.
- First Admin bootstrap requires your configured password secret instead of a universal fallback password.
- `wrangler.jsonc` points to a new gym project and a placeholder for a NEW D1 ID. Deploy helpers reject the original database ID.
- New migration 0056 changes presentation defaults only. It creates no tables or columns.
- Default structured metadata identifies the business as an ExerciseGym. Schema.org `Article` metadata remains a protocol type rather than being renamed as display text.

## Browser coverage

Home, Member signup, Member and Coach dashboards, gym specialties, placeholders, the mobile full-screen payment modal and Info helper, PWA manifest, Admin/public header/footer names, mobile submenus, saved custom labels, repeated renders/reloads, invalid/failed/stalled configuration, Retry, refresh deduplication, and mobile/desktop Schedule loading/error recovery were checked. Navigation was exercised at 320, 390, 760 and 1440px widths.

Browser data was synthetic. Configuration handlers used real SQLite fixtures. The separate local Cloudflare runtime additionally tested migrations, public configuration, redirect/header behaviour, first Admin login, session authorization and logout against a temporary D1 instance.

## Reproduce

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:gym:browser
npm run test:gym:runtime
```

Node 24.19.0 was used. Machine-readable results and logs are in `verification/ironpulse-v1.00/`. Browser screenshots are excluded from the deliverable.

Historical release-specific name/version/hash guards are retained as upstream history. The current release suite is `npm test`.

Live Cloudflare resources, live payment processing and Google account consent were not created or exercised here. Complete the account-specific steps in `START-HERE.md`; no live charges or account changes were made. This is a verified source release with setup helpers, rather than a claim of a live deployment.
