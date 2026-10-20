# DropBeat Dance Studio V1.24 release notes

## Fixes included

1. **Schedule Meeting freeze**
   - Removed the blocking capability preflight from the click path.
   - The form now opens immediately in Online Classes, Offline Classes and Demo / Webinar.
   - Added safe Close, backdrop and Escape handling, date validation, submit locking and error recovery.
   - A successful meeting remains stored in the existing webinar event/member tables and returns to the correct Scheduled Events workspace.

2. **Schedule workspace typography**
   - Reduced the oversized inner tab, heading, table and action text in Schedule, Leaves and Holidays.
   - Reused existing theme variables; no brand colours were changed.

3. **Holiday audience coverage**
   - Portal and email notices now include student/coach accounts regardless of approval or payment status.
   - Saved lead, class-member and customer email addresses without portal accounts receive email notices.
   - Email addresses are normalized and deduplicated so the same person is not queued twice.

4. **Coach Settings layout**
   - Increased the Coach Onboarding & Leave Rules card height and removed its desktop inner scrollbar.
   - Made Save Coach Settings a compact, right-aligned action.

5. **Coach Details**
   - Added leave-rule mode, paid-leave allowance, deduction method and last payment date beside the existing approved remuneration.
   - Added an optional Last Payment Date field to Edit Terms so the displayed value can be maintained accurately.

## Data safety

Migration `0054_dropbeat_meeting_holiday_coach_details_v1_24.sql` only adds a holiday-audience delivery table and a last-payment-date column. Existing classes, payments, users, coach terms, theme settings and historical records are preserved.
