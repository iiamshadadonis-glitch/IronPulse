# DropBeat Dance Studio V1.22 Release Notes

## Admin access and navigation

- Prevents hidden authentication overlays from intercepting clicks after a successful Admin login.
- Keeps **Schedule** registered under Webinars through refreshes and later navigation renders.
- Uses scoped V1.22 styles so the established site palette and protected theme files remain unchanged.

## Attendance and schedule

- Places selected-session details in their own responsive card below the calendar.
- Gives class/event, time, duration, coach, enrollment, present count, coach attendance and reviews defined columns, padding and mobile fallbacks.
- Applies the same readable grid rules to Student and Coach list views beside the calendar.
- Makes coach names, present counts and review counts functional controls, including useful empty states when the count is zero.
- Adds complete coach and student detail dialogs with schedules, current/past students, attendance totals and available review/profile data.
- Prevents recurring sessions from appearing before the explicit batch date or first valid paid enrollment and advances non-working dates to the next coach working day.

## Leaves and holidays

- Replaces collapsed selectors with direct Leaves tabs for Pending Approval, Today's Absence, Planned/Upcoming, Unplanned and Past Leaves.
- Adds notification badges and approve, deny and request-more-information actions while retaining the leave history.
- Provides direct Upcoming Holidays and Past Holidays tabs and a working Add Holiday dialog.
- Keeps only the clickable event name in holiday grids; subject, image, message and dates remain in the preview.
- Preserves the admin's message paragraphs and blank lines in preview, dashboard notification and branded email output.
- Keeps Event End Date hidden until **+ Add an end date** is chosen.
- Represents studio holidays in both Student and Coach attendance calendars.

## Images, domains and Gmail

- Normalizes supported Google Drive share/download values into browser-displayable inline image URLs for holiday, student and coach images.
- Uses safe fallbacks for older stored Drive links without changing the existing upload workflow.
- Makes website/document links, Search Console property values and integrations follow the active request hostname.
- Standardizes the sitemap address as `/sitemap.xml`.
- Displays only the Google identity returned by OAuth and requires verified `gmail.send` permission before mail or OTP reports ready.
- Avoids the Gmail profile request that rejects a narrow send-only grant with an insufficient-scope 403.

## Coach Add/Edit and sign-up parity

- Includes name, email, phone/WhatsApp, profile image, designation, badge, biography, experience and optional Instagram/Facebook fields.
- Uses repeatable Teaching Availability sessions with day, time, class type and dance styles instead of disconnected availability controls.
- Uses the compact **+ Sessions** label in Admin and coach sign-up.
- Deliberately omits password entry when an admin creates a coach; direct coach registration retains its password flow.
- Preserves existing plan/workspace compatibility by deriving the older capability fields server-side.

## Account access and identity

- Adds one-time-code account access with expiry, attempt limits and single-use consumption.
- Adds safe identity matching/synchronization for approved Student and Coach accounts.
- Keeps unverified or ambiguous records from silently receiving access.
- Adds account/session views to Admin without weakening existing authorization checks.

## Class sessions and changes

- Adds managed meeting occurrence lifecycles for scheduled, live, ended and cancelled sessions.
- Prevents an ended or cancelled occurrence from being silently recreated.
- Supports scheduled class changes and coach replacements with effective dates.
- Restores temporary changes at expiry before applying a later due change.
- Preserves historical coach/session ownership while allowing sequential permanent future changes.

## Coach remuneration

- Adds effective-dated remuneration terms and monthly coach statements.
- Supports session-based, hourly and configured base calculations.
- Excludes future sessions from missed-session deductions.
- Applies approved leave only to scheduled teaching dates and respects the paid-leave allowance.
- Exposes the calculated-through date so incomplete future periods are not mistaken for final results.

## Dashboard metrics and safety

- Adds pending/approved/rejected Student and Coach sign-up counts and profile inspection controls.
- Keeps coach filter choices stable even after filtering a remuneration report.
- Excludes invalid-payment enrollments from rosters, attendance opportunities and session-start calculations.
- Adds one additive migration only; no existing table, column or record is deleted.
