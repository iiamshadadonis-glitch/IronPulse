# DropBeat Dance Studio V1.22 — Start Here

This is the complete replacement package for the Admin Dashboard, Webinars Schedule, Attendance, holidays, images, coach management, account access, class sessions and remuneration updates. It contains all earlier DropBeat releases and preserves the existing colour theme and established student/payment logic.

## Replace the complete project

Replace the previous project with the entire V1.22 folder. Do not copy only `public`, only the admin files, or only migration `0052`.

- Windows: double-click `DEPLOY-V1.22-WINDOWS.bat`.
- macOS/Linux: run `bash DEPLOY-V1.22-MAC-LINUX.sh`.

The helper runs the full verification suite before deployment, applies the additive migrations to the existing D1 database, and then deploys the verified application. It does not delete or reset existing records.

## What to check after deployment

1. Open Admin in a private browser window and sign in normally. Confirm the dashboard accepts clicks and **Webinars → Schedule** remains visible after navigation and reload.
2. Open **Webinars → Attendance**. Check Student and Coach calendar/list layouts, select a session, and open the coach, present-student and review links.
3. Open **Webinars → Schedule**. Select a coach name and verify Schedule, Current Students and Past Students open inside the coach dialog.
4. Open Leaves and confirm Pending Approval, Today's Absence, Planned/Upcoming, Unplanned and Past Leaves are visible tabs rather than dropdowns.
5. Open Holidays, add a single-day holiday, and confirm Event End Date appears only after **+ Add an end date** is selected. Preview a multi-paragraph message and its image.
6. Open Add/Edit Coach and confirm the Teaching Availability rows, contact/profile fields and **+ Sessions** button are present.
7. Open Integrations and confirm the Search Console property follows the current hostname and the sitemap is `https://current-host/sitemap.xml`.
8. If Gmail was connected before V1.21, reconnect it once and confirm the exact Google account selected during OAuth appears before enabling email/OTP.
9. Review the new account/session and coach-remuneration areas before enabling them for daily use.

## Session start-date behavior

- When a public batch start date exists, sessions start from that date on the first scheduled teaching day.
- Without a public batch start date, the first valid paid member purchase becomes the eligibility date.
- If that date is not one of the coach's working days, the batch starts on the next configured working day.
- No occurrence is shown before that effective start date.
- Cancelled or ended occurrences stay historical and are not recreated by a later calendar refresh.

## Existing-site safety

V1.22 adds migration `0052_dropbeat_access_sessions_remuneration_v1_22.sql`, bringing the package to 52 ordered migrations. The migration only adds the tables and indexes required for V1.22. Existing users, plans, payments, attendance, content, settings and theme values are retained.

## Gmail note

An old Gmail connection without a Google-verified identity or `gmail.send` permission is deliberately treated as disconnected. Reconnect through **Admin → Integrations → Gmail**. A verified Gmail “Send mail as” alias may still be used as the sender, while the actual connected Google account is shown separately.
