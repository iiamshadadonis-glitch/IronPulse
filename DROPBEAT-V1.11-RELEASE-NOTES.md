# DropBeat Dance Studio V1.11

V1.11 is an additive replacement release based on V1.10. Existing payment, subscription,
CRM, analytics, coach, class, reminder, brand, and public-site logic is preserved.

## Plans and offers

- Public Batch Start Date is checked against the selected coach’s saved working days.
- An unavailable weekday is cleared immediately in the browser and independently rejected
  by the server, so an old browser or direct API request cannot bypass the rule.
- One-time catalog plans now require Class Start Date and Class End Date.
- One-time access remains valid through the end date and moves to Past Members the next day.
- Plan Features are separate 80-character fields in a responsive two-column editor.
- Existing feature lists automatically open as individual fields; only the last field has
  the add button, and removable fields have a minus button.
- Help & Instructions explains the coach-safe date, public-date modes, dynamic features,
  one-time access, reminders, and schedule behavior.

## Public plan presentation

- The promotional block is now three clear lines: New batch starts, the formatted date,
  and Enrolment is open now.
- Promotional dates configured to hide after the start date leave no blank space afterward.
- Class days, batch time, duration, and coach use separate readable rows.
- The presentation is applied through the shared product renderer used by Home, Offers,
  Festival Offers, Yearly Plans, and other plan-placement pages.
- Offer Details has a deliberate heading hierarchy for the page title, booking card,
  About the Plan, You Should Know, and Recommended Plans.
- You Should Know now uses dance-studio-specific guidance without casting, submissions,
  employment, shoots, callbacks, or selection language.

## Class workspaces and students

- Scheduled-event grids use bounded columns and consistent spacing.
- A non-zero Students count is clickable.
- The roster dialog shows serial number, student name, contact, payment status,
  payment/status date, and an action.
- Removing a student requires typing REMOVE, preserves payment history, cancels pending
  class reminders, records a lifecycle event, and moves the student to Past Members.
- Past Members includes a Status Date column for cancellation, failure, expiry, or admin removal.
- Track Order shows upcoming, active, last-day, and expired one-time class access guidance,
  including links to memberships and Contact.

## Cache and database safety

- Frontend and admin assets use V1.11 cache keys and V1.11 response-cache namespaces.
- Dynamic blog and custom-page HTML also emits V1.11 asset URLs.
- Migration `0047_dropbeat_plan_access_dates.sql` adds access dates to catalog plan mappings.
- Runtime schema repair safely adds the same fields when a replacement deployment is used
  without manually running a migration command.

