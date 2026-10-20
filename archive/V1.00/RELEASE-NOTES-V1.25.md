# DropBeat Dance Studio V1.25 release notes

## Fixes included

1. **Schedule Meeting freeze**
   - Routes all three Schedule Meeting buttons through a new isolated `db125ScheduleModal` instead of the legacy modal ID watched by older enhancement layers.
   - Renders the usable form synchronously, then loads optional plans, coaches and reminder capabilities in the background with bounded timeouts.
   - Preserves the existing customer search, reminder selection, provider selection and `schedule_webinar` save contract.
   - Keeps Close, backdrop and Escape actions available and refreshes the appropriate Scheduled Events workspace after a successful save.

2. **Light and dark mode throughout the site**
   - Adds a compact sun/moon control to every complete public, login, admin, student and coach page.
   - Uses the operating-system preference until the visitor deliberately chooses a mode, then stores that override locally.
   - Leaves the existing light theme unchanged and reuses its primary/accent brand colours in dark mode.

3. **Approved Remuneration switch in Add/Edit Coach**
   - Replaces the “Add terms now” checkbox with an accessible toggle switch.
   - Keeps payment basis, approved rate, effective dates and notes hidden and disabled until enabled.
   - Existing configured remuneration is automatically expanded when an admin edits that coach.

## Data safety

V1.25 adds no D1 migration and does not alter existing class, student, coach, payment, schedule, holiday or remuneration records.
