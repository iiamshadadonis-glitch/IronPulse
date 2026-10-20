# DropBeat Dance Studio V1.20 Release Notes

## Root-cause corrections

- The established navigation normalizer previously rebuilt Webinars from its own list and removed the dynamically added Schedule button. Schedule is now part of that authoritative list, so it persists after refresh and delayed updates.
- Existing admin CSS displays a modal only when it has the `open` state. The new Schedule and Attendance dialogs now apply and remove that state consistently.

## Schedule and Attendance interactions

- Coach names open full coach details from Schedule and all Attendance views.
- Coach details now include a Reviews tab with session, student, rating and comment information.
- Present counts open Present/Absent rosters even when both counts are zero.
- Reviews are clickable for every session and open a session-specific review dialog, including a clear zero-review state.
- Loading and API failure feedback appears inside the requested dialog instead of leaving only a busy pointer.

## Leaves and Holidays layout

- Replaces collapsible leave rows with five direct sub-tabs.
- Replaces collapsible holiday rows with Upcoming and Past sub-tabs; Upcoming is the default.
- Removes dropdown arrows and hides all zero-value notification circles.
- Adds numeric badges for non-empty leave and holiday tabs using the existing theme variables.
- Adds Request Info for pending coach leaves while leaving the request pending for a later approval or denial.

## Safety

- Existing schedule-start, attendance, student-dashboard, payment and membership logic remains unchanged.
- No existing brand or colour-theme stylesheet was edited.
- No table or column is removed or replaced.
