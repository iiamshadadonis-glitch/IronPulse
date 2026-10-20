# Urgent Casting V17.08 — Release Verification

## Included changes

- Email & OTP provider rows now inherit the compact Gmail/WhatsApp card stack sizing, typography, padding and themed chevron alignment.
- Lead Email Follow-up hides social platform filters and displays every condition as explicit **Yes** and **No** paths.
- Webinar invitation shows the attendee feedback path separately from the missed-attendee re-registration path.
- Birthday wishes remains connected to Contacts CRM `date_of_birth`: advance email three days before, birthday email on the saved month/day.
- Online Classes, Offline Classes and Demo / Webinar include **Add New Member** beside **Schedule Meeting**.
- New members support saved-contact search, payment summary prefill, start date/time, hours and minutes, days per week, weekday selection, Asia/Kolkata timezone, notes and recurring reminder channels.
- Expired trials and failed/cancelled subscriptions move from Current Members to Past Members and receive a Past Members badge.
- New static assets use the V17.08 cache-busting version.

## Verification commands

```sh
npm run test:v17.08
node --check public/admin/final-v17-05-email-automations.js
node --check public/admin/final-v17-08-workflows-members-ui.js
node --check functions/_lib/marketing-suite.js
node --check functions/api/admin/marketing-suite.js
```

The V17.08 test includes an in-memory SQLite execution of member creation, recurring reminder seeding and automatic Past Member movement.
