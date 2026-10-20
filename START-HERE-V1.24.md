# DropBeat Dance Studio V1.24

This is the complete replacement package built from the supplied V1.23 code. It preserves the existing colour theme and established application workflows while applying only the requested meeting, layout, holiday-audience and coach-detail corrections.

## Deploy

1. Back up the current Cloudflare Pages project and D1 database.
2. On Windows, double-click `DEPLOY-V1.24-WINDOWS.bat`; on macOS/Linux, run `bash DEPLOY-V1.24-MAC-LINUX.sh`.
3. Alternatively, deploy this complete directory to the same Pages project and apply migrations through `0054_dropbeat_meeting_holiday_coach_details_v1_24.sql`.
4. Clear the browser cache or open the admin in a private window once after deployment.
5. The helper runs `npm run test:dance-v1.24` before applying migrations or publishing.

## Verify after deployment

- Open Webinars → Online Classes, Offline Classes and Demo / Webinar. In each workspace, click **Schedule Meeting**, close it once, then schedule a test event and confirm it appears under Scheduled Events.
- Open Webinars → Schedule and confirm the Schedule, Leaves and Holidays text is compact and consistent.
- Open Brand Settings → Coach Settings and confirm the Coach Onboarding & Leave Rules card has no internal vertical scrollbar and the save action is a compact button at the lower right.
- Open any Coach Details dialog and confirm remuneration, leave rules, monthly paid-leave allowance, deduction method and last payment date are visible.
- Create a future Studio Holiday and confirm a pending student/coach account and a saved lead email are included in its delivery records.

No migration in this release deletes or resets existing data.
