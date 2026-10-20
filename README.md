# DropBeat Dance Studio V1.50

Complete replacement based on V1.49 Verified. Start with `START-HERE-V1.50.txt`; the full changes and cache boundaries are in `V1.50-FIXES.md`. No new dependency, migration or Cloudflare binding is required.

# DropBeat Dance Studio V1.49 — Complete Replacement

Start with `START-HERE-V1.49.txt`. Completed fixes are listed in `V1.49-FIXES.md`; executed tests and their limits are recorded in `V1.49-VERIFICATION.md`. All V1.48 project files are retained.

Earlier release documentation follows.

# DropBeat Dance Studio V1.48 — Complete Replacement

Start with `START-HERE-V1.48.txt`. Completed fixes are in `V1.48-FIXES.md`; executed tests and their limits are in `V1.48-VERIFICATION.md`. All V1.47 project files and original business handlers are retained.

Earlier release documentation follows.

# DropBeat Dance Studio V1.47 — Complete Replacement

Start with `START-HERE-V1.47.txt`. Completed fixes are in `V1.47-FIXES.md`; executed checks and their limits are in `V1.47-VERIFICATION.md`. This is the complete project, retaining the verified V1.46 application and original save handlers.

Earlier release documentation is retained below.

# DropBeat Dance Studio V1.46 — Complete Replacement

Start with `START-HERE-V1.46.md`. The complete fixes are listed in `RELEASE-NOTES-V1.46.md`; executed checks and limits are in `DANCE-STUDIO-V1.46-VERIFICATION.md`. Use the V1.46 deployment script for your operating system.

Historical release documentation is retained below for reference.

# DropBeat Dance Studio V1.43 — Complete Replacement

Start with `START-HERE-V1.43.md`. Read `RELEASE-NOTES-V1.43.md` for the fixes in this replacement and `DANCE-STUDIO-V1.43-VERIFICATION.md` for verification. Use the V1.43 deployment script for your operating system.

Previous release documentation is retained below for reference.

# DropBeat Dance Studio V1.41 — Complete Replacement

Start with `START-HERE-V1.41.md`. The full fix list is in `RELEASE-NOTES-V1.41.md`; verification is in `DANCE-STUDIO-V1.41-VERIFICATION.md`. Use the V1.41 deployment script for your operating system.

The earlier release documentation below is retained for reference.

# DropBeat Dance Studio V1.40 — Complete Replacement

Start with `START-HERE-V1.40.md`. The complete fix list is in `RELEASE-NOTES-V1.40.md`; bulk import instructions are in `BULK-PLAN-IMPORT-V1.40.md`. Use the V1.40 deployment script for your operating system.

The earlier project documentation below is retained for reference.

# DropBeat Dance Studio V1.25 — Complete Cloudflare Replacement

This package is the complete V1.25 replacement for the DropBeat Dance Studio Cloudflare Pages application. It contains every earlier release, keeps V17.09 application compatibility, preserves the established light theme, isolates the Schedule Meeting workflow from legacy modal observers, adds system-aware light/dark mode throughout the application, and converts Add/Edit Coach remuneration into a collapsed switch-controlled section.

Start with `START-HERE-V1.25.md`. Do not copy only `public` or an individual JavaScript file—the `functions`, `migrations`, `public`, `tests`, `package.json`, `package-lock.json` and `wrangler.jsonc` items must remain together.

## Important data-safety rule

Do not connect this project to an unrelated D1 database. `wrangler.jsonc` is already configured for the DropBeat project. Migration `0054_dropbeat_meeting_holiday_coach_details_v1_24.sql` is additive; it does not delete or reset existing records.

## Deployment

- Windows: double-click `DEPLOY-V1.25-WINDOWS.bat`.
- macOS/Linux: run `bash DEPLOY-V1.25-MAC-LINUX.sh`.
- Git-connected Cloudflare Pages: replace the prior repository contents with this complete folder and commit to the existing deployment branch.

The deployment helper installs dependencies, runs the complete V1.25 and inherited regression suite, applies additive D1 migrations, and deploys the verified `public` directory.

## V1.25 highlights

- Schedule Meeting in Online Classes, Offline Classes and Demo / Webinar now opens through an isolated modal ID that legacy observers cannot rebuild. Optional plan, coach and capability requests run only after the form is usable, have timeouts, and never prevent Close, backdrop or Escape recovery.
- Successful scheduling keeps the existing `schedule_webinar` backend and refreshes Scheduled Events in the correct workspace.
- A small sun/moon control is available on the admin, login, student and coach dashboards and every public page. It follows the device preference by default and saves a deliberate user override.
- Light mode inherits the existing brand colours unchanged; dark mode changes neutral surfaces while retaining the configured primary/accent colours.
- Add/Edit Coach uses an **Add Approved Remuneration** switch. Payment basis, approved rate, effective dates and admin notes remain hidden and disabled until the switch is enabled.

## Inherited V1.24 highlights

- Schedule Meeting opens immediately in Online Classes, Offline Classes and Demo / Webinar, remains closable after errors, and refreshes the appropriate scheduled-events workspace after saving.
- Schedule, Leaves and Holidays use compact typography consistent with their primary tabs.
- Holiday notices include active, pending, past and otherwise unapproved student/coach portal accounts, plus deduplicated lead/member/customer email addresses.
- Coach Settings no longer uses a desktop inner scrollbar, and Save Coach Settings is a compact right-aligned action.
- Coach Details now shows remuneration, leave-rule mode, monthly paid-leave allowance, deduction method and last payment date.

- Shows Studio Holidays in Online Class, Offline Class, Demo/Webinar and Attendance calendars and blocks holiday meeting access.
- Keeps Current/Running and Cancelled class grids visible when empty and exposes the existing Manage Class actions.
- Adds a guarded Admin Join Session action from five minutes before an online session until its scheduled end.
- Synchronizes student account edits with the matching lead/client identity by email or normalized phone number.
- Adds studio-wide leave rules, per-coach custom rules and a complete per-coach leave-calculation bypass.
- Derives coach working days and expected weekly/monthly sessions from Teaching Availability instead of duplicate manual fields.
- Adds an in-card Coach Settings help guide while preserving the existing theme variables.
- Keeps tags, pixels and conversion APIs under Marketing; keeps Google Ads, Google Tag Manager API, Google Analytics API and Mailchimp under Marketing Integrations with OAuth redirect URIs.

## Verification

Run:

```sh
npm run test:dance-v1.25
```

The release verification details are in `DANCE-STUDIO-V1.25-VERIFICATION.md`, and the implementation summary is in `RELEASE-NOTES-V1.25.md`.

## Compatibility note

Legacy internal route names, table names and product identifiers remain intact wherever changing them could break deployed data or tested logic. V1.25 reuses those contracts and does not add a database migration.
