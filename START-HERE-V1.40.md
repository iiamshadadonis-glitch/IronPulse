# DropBeat Dance Studio V1.40 — complete replacement

Use this entire project folder to replace V1.39. It includes the website, all three dashboards, server functions, migrations, tests and existing Cloudflare configuration.

Start with the included `RELEASE-NOTES-V1.40.md` for the fix list. Every replacement release includes its own release notes.

## Deploy

1. Extract the ZIP and open `dropbeat-dance-studio-complete-replacement-v1.40`.
2. Keep your existing Cloudflare project, D1 database binding, secrets and integration settings.
3. Windows: run `DEPLOY-V1.40-WINDOWS.bat`. macOS/Linux: run `bash DEPLOY-V1.40-MAC-LINUX.sh`.
4. If your existing Pages project deploys from Git, replace the existing project files with this complete folder and commit to the same deployment branch.
5. When deployment completes, reload any already open dashboard tab once. New sessions discover the V1.40 assets automatically.

The scripts install dependencies, run `npm run test:dance-v1.40`, then use the existing `npm run deploy` command. Use a current Node.js LTS version with `node:sqlite` support (Node 22.13 or newer).

No new migration or database reset is required for V1.40. Do not deploy only the public folder: the new bulk importer also needs the included Functions code. Keep using Cloudflare Pages + Pages Functions.

The response header `X-DropBeat-Release: 1.40.0` and the browser value `DropBeatMobileUI.build` identify the deployed build. HTML is not cached, new assets have versioned filenames, and edge delivery removes earlier mobile controllers.

## Bulk Plan Upload

In Sales → Bulk Plan Upload, download the new sample CSV. Use up to 50 plan rows per file, keep column names unchanged, and use the same SKU to update a plan. The two sample rows are Draft examples. Edit their descriptions, prices, dates, class details and display choices before importing. Optional image URLs must be public HTTPS links.

See `BULK-PLAN-IMPORT-V1.40.md` for the field guide and `DANCE-STUDIO-V1.40-VERIFICATION.md` for test coverage.
