# DropBeat Dance Studio V1.19 — Start Here

This is the complete replacement package requested for Attendance and Schedule. It keeps the existing website, payment, membership and colour-theme files in place, while adding the date-safe attendance logic, readable tables, coach/student detail views, leave workflow and holiday workflow.

## Simplest replacement method

Replace the previous project with the entire V1.19 folder. Do not copy only one JavaScript or CSS file.

- Windows: double-click `DEPLOY-V1.19-WINDOWS.bat`
- macOS/Linux: run `bash DEPLOY-V1.19-MAC-LINUX.sh`

The helper installs the deployment tool, runs the complete inherited verification suite, applies the new additive migration, and deploys the verified site. It does not reset or delete existing records.

## What V1.19 changes

- A recurring class appears only from its explicit batch/access start date.
- When no batch start is set, the first paid student's membership date becomes the source date and the batch advances to the next permitted teaching day.
- Attendance Calendar and List share one fixed-width, padded table with separate columns for class/event, time, duration, coach, enrolled, present, coach attendance and reviews.
- The selected-date table is a separate card beneath the calendar.
- Coach names are clickable and open a full Schedule / Current Students / Past Students dialog.
- Student names open attendance totals calculated from that student's own join date, attendance history and reviews.
- Webinars now contains **Schedule** beneath **Attendance**.
- Schedule lists every coach, including coaches without planned sessions.
- Coaches have **Apply for Leave**. Admin can approve or deny, with a required denial reason and optional suggested date.
- Holidays can be one day or a date range, include a subject, message and optional Google Drive image, appear in Attendance, block session access/reminders, and create branded email/dashboard notices.

## First checks after deployment

1. Sign in as admin and open **Webinars → Attendance**.
2. Move to a month before a known batch start and confirm that batch is absent.
3. Select a date with a session and confirm the results appear in a separate card beneath the calendar.
4. Open **List**, then click a coach name and a student attendance count.
5. Open **Webinars → Schedule** and click a coach name.
6. Sign in as a coach, open **Apply for Leave**, and submit a test request.
7. Return as admin, approve or deny the request under **Schedule → Leaves**.
8. Add a test holiday under **Schedule → Holidays** and confirm it appears in Attendance.

## Safe rollback note

Migration `0051_dropbeat_schedule_leaves_holidays_v1_19.sql` only adds new tables and indexes. It does not remove or rewrite existing data. Keep the previous Cloudflare deployment in deployment history as the normal rollback point.
