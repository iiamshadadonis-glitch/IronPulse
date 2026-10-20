# V16.95 Release Verification

- [x] Version and admin asset cache keys updated to V16.95.
- [x] Heat-map legacy/new renderer race removed.
- [x] Preview frame null guard present.
- [x] Desktop, tablet and mobile widths fit the card without horizontal scrolling.
- [x] Parent preview scrolls vertically and measures the rendered page height.
- [x] Heat-map and marketing help content expanded with actions, examples, formulas, links and warning.
- [x] Duplicate reminder selection chips removed; platform buttons toggle accessibly.
- [x] Reminder completeness validation retained before event creation.
- [x] Branded email, calendar guest invitations, WhatsApp/SMS delivery and admin-call reminders preserved.
- [x] Duplicate integration chevron removed while the existing themed disclosure arrow remains.
- [x] No database schema or D1 migration added.

Run `npm run test:v16.95` from the project folder for the complete V16.95 regression set.
