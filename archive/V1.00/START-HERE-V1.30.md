# DropBeat Dance Studio V1.30

This complete replacement is built directly from the supplied V1.29 package. It completes dark mode across the reported Admin grids, calendars, analytics, dialogs and public About/Dance Tips pages while leaving light mode and business logic unchanged.

## Safe deployment

1. Back up the current Cloudflare Pages project and D1 database.
2. Replace the project files with this complete V1.30 package. Do not delete or recreate D1.
3. Run `DEPLOY-V1.30-WINDOWS.bat` on Windows or `bash DEPLOY-V1.30-MAC-LINUX.sh` on macOS/Linux.
4. The helper installs dependencies, runs V1.30 plus every inherited regression test, applies the existing additive migrations, and deploys only after tests pass.

## Verify after deployment

- Switch Admin to dark mode and open Sales → Plans & Offers → Add/Edit Plan. Class/Event Details, reminders and next steps should use dark surfaces with readable labels.
- Check Product Display, Client Details, Contact Details, Approvals and Coach Details. Their inner grids should no longer remain white.
- Check Growth Analytics in line, bar, horizontal bar and pie modes, then switch modes while a chart is visible. Axes, labels and grid lines should repaint immediately.
- Check Analytics → Calendar in both Calendar and List views.
- Check Webinars coach cards and Attendance calendars/detail grids.
- Check Social Media post scheduling/video creation, Pages header preview/order and Brand Settings → Website Colors.
- On the public About page, confirm the main heading is visible in dark mode.
- On Dance Tips, confirm the sun/moon control remains visible and both the list and article views use dark mode.
- Return to light mode and confirm the existing light presentation is unchanged.

No new D1 migration is included in V1.30.

