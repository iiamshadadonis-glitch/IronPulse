# DropBeat Dance Studio V1.44 — complete replacement

This ZIP contains the complete application: public website, Admin/Coach/Student dashboards, Pages Functions, migrations, configuration and tests. Replace the existing V1.43 project files with this complete folder.

Read `RELEASE-NOTES-V1.44.md` for the full fix list. Every replacement includes its own release notes.

## Deploy

1. Extract the ZIP and open `dropbeat-dance-studio-complete-replacement-v1.44`.
2. Keep using the existing Cloudflare Pages project, D1 database binding, secrets and integration settings.
3. Windows: run `DEPLOY-V1.44-WINDOWS.bat`. macOS/Linux: run `bash DEPLOY-V1.44-MAC-LINUX.sh`.
4. For an existing Git-based Pages deployment, replace the project files and commit to the same deployment branch.
5. Reload already-open dashboard tabs once after deployment. New sessions load the new assets automatically.

The scripts install dependencies, run `npm run test:dance-v1.44`, then use the existing `npm run deploy` command. The current regression suite uses Node's SQLite support; use Node 22.13 or newer.

No new migration or database reset is needed for V1.44. Deploy the whole project, including Functions, using the existing Cloudflare Pages + Pages Functions configuration.

## Identify the installed release

The response header is `X-DropBeat-Release: 1.44.0`. On a dashboard, `DropBeatMobileUI.build` is `dropbeat-1.44-20261015`. Each shell loads only `dropbeat-dashboard-mobile-v1-44.js` as its mobile controller. Previous controller files remain in the archive for history but are not loaded.

Dashboard HTML uses no-store. The new CSS/JS filenames and changed presentation-script build URLs provide cache busting. Saved theme colors remain authoritative.

## Included guides

- `RELEASE-NOTES-V1.44.md`: fixes in this replacement.
- `DANCE-STUDIO-V1.44-VERIFICATION.md`: test coverage and commands.
- `V1.44-RELEASE-MANIFEST.json`: changed/added files and their SHA-256 hashes.
- `BULK-PLAN-IMPORT-V1.40.md`: retained CSV/import guide and current sample instructions.

The existing sample CSV and bulk importer are retained from V1.40. This update introduces no new server payment, refund or authentication behavior.
