# DropBeat Dance Studio V1.25

This is the complete replacement package built from the supplied V1.24 code. It preserves all existing application and light-theme behaviour while applying the requested Schedule Meeting, light/dark mode and Add/Edit Coach remuneration-interface corrections.

## Deploy

1. Back up the current Cloudflare Pages project and D1 database.
2. On Windows, double-click `DEPLOY-V1.25-WINDOWS.bat`; on macOS/Linux, run `bash DEPLOY-V1.25-MAC-LINUX.sh`.
3. Alternatively, deploy this complete directory to the same Pages project. V1.25 adds no migration; the helper safely reapplies the existing additive migration set.
4. Clear the browser cache or open the website in a private window once after deployment so the V1.25 assets load.
5. The helper runs `npm run test:dance-v1.25` before applying migrations or publishing.

## Verify after deployment

- In Webinars → Online Classes, Offline Classes and Demo / Webinar, click **Schedule Meeting**. Confirm the dialog opens immediately, Close/Escape works, and a saved test appears under Scheduled Events.
- Confirm the sun icon appears in light mode, switches to a moon in dark mode, and the selected mode remains after refresh.
- Check the admin, login page, public website, Student Dashboard and Coach Dashboard. With no saved choice, each must follow the device light/dark setting.
- Open Add Coach or Edit Coach from either admin entry point. Confirm **Add Approved Remuneration** is a switch and its fields appear only after it is enabled.

No migration in this release deletes, resets or changes existing data.
