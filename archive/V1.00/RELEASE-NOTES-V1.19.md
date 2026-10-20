# DropBeat Dance Studio V1.19 Release Notes

## Attendance corrections

- Enforces effective batch starts across admin attendance and student/coach schedules.
- Uses explicit access/batch start first; otherwise uses the earliest member start.
- Advances a first purchase to the next allowed weekday when necessary.
- Filters enrolled rosters by the selected session date rather than today's membership state.
- Adds holiday and approved-leave markers and blocks joining/starting those sessions.

## Interface corrections

- Separates the calendar and selected-date session cards.
- Adds an eight-column, fixed-layout attendance table used by Calendar and List.
- Adds consistent padding, wrapping and horizontal overflow protection.
- Makes coach names clickable in all attendance tables.
- Extends the student dialog with join date, possible sessions, attended sessions, monthly totals, percentage, history and reviews.

## Schedule, leave and holiday additions

- Adds the Webinars → Schedule admin workspace.
- Adds coach schedule summaries and detailed coach dialogs with Schedule, Current Students and Past Students tabs.
- Adds coach leave applications and admin approval/denial controls.
- Adds upcoming and past holiday management, one-day/date-range events, Google Drive image upload and preview.
- Uses existing Brand Settings for holiday email branding.
- Adds dashboard notices and branded-email delivery records with retry support.

## Data safety

- Adds migration `0051_dropbeat_schedule_leaves_holidays_v1_19.sql`.
- Existing payment, membership, attendance, review, brand and theme records remain authoritative.
- No table or column is deleted.
