# DropBeat Dance Studio V1.20 — Start Here

This is the complete replacement package for the Schedule visibility and interaction corrections. It keeps the existing website, attendance date logic, payment logic, student logic and colour-theme files in place.

## Simplest replacement method

Replace the previous project with the entire V1.20 folder. Do not copy only one JavaScript or CSS file.

- Windows: double-click `DEPLOY-V1.20-WINDOWS.bat`
- macOS/Linux: run `bash DEPLOY-V1.20-MAC-LINUX.sh`

The helper installs the deployment tool, runs the complete inherited verification suite, confirms the existing additive migrations and deploys the verified site. It does not reset or delete existing records.

## What V1.20 corrects

- **Schedule** remains permanently visible beneath **Webinars → Attendance**, including after refresh and delayed navigation rebuilding.
- Coach names open their complete detail dialog from Schedule and from both Attendance Calendar and List views.
- Present counts open the Present/Absent student dialog even when the value is `0 / 0`.
- Review counts open a session-specific dialog containing student names, ratings and written comments; zero reviews show a clear empty state.
- Coach details include Schedule, Current Students, Past Students and Reviews.
- Leaves use direct tabs for Pending Approval, Today's Absence, Planned / Upcoming, Unplanned Leave and Past Leaves.
- Leave badges display a number only when records exist. Empty purple circles are removed.
- Pending leaves provide Approve, Request Info and Deny actions.
- Holidays use direct Upcoming Holidays and Past Holidays tabs. Add Holiday remains above the tabs and opens its editor dialog.
- All affected dialogs show an immediate loading state and a visible error message if a request fails.

## First checks after deployment

1. Open the admin dashboard and confirm **Webinars → Schedule** stays visible for at least one minute and after navigating between sections.
2. Open Schedule and click each coach name.
3. Open Leaves and switch through all five direct tabs; there should be no dropdown arrows or empty badge circles.
4. Open Holidays, confirm Upcoming Holidays is selected by default, then click Add Holiday.
5. Open Attendance Calendar and List, then click a coach name, a `0 / 0` Present value and a `0` Reviews value.
6. Refresh once or open a private window to confirm the V1.20 cache-busted files are active.

## Data safety

V1.20 does not add a destructive migration. Existing migration `0051_dropbeat_schedule_leaves_holidays_v1_19.sql` remains the authoritative additive schedule schema and is safe to run again through the normal migration command.
