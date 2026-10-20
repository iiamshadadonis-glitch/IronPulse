# DropBeat Dance Studio V1.11 Verification

## Result

`npm run test:dance-v1.11` completed successfully on 26 September 2026.

The command runs the new V1.11 regression suite and every inherited DropBeat and platform
suite through the V17.09 chain.

## V1.11 checks

- All 47 SQL migrations apply to a clean SQLite database.
- A Monday/Tuesday/Wednesday coach rejects Sunday 27 September 2026 as a Public Batch Start Date.
- The same coach accepts Monday 28 September 2026.
- One-time plan mappings reject missing access dates.
- One-time plan access dates persist in `product_class_mappings`.
- Expired one-time access automatically creates or updates a Past Member with an end-date reason.
- Student removal rejects an incorrect confirmation, accepts REMOVE, preserves the record,
  changes payment status to `removed_by_admin`, and writes a past-member lifecycle event.
- V1.11 admin and public assets are active; V1.10 active references are absent.
- V1.11 cache namespaces and dynamic page asset URLs are active.
- Dynamic Plan Feature fields, 80-character limits, roster UI, status dates, structured schedule
  rows, and offer-detail typography/copy are present in the shipped assets.

## Inherited regression checks

- Cloudflare Pages deployment configuration and D1 binding
- Admin authentication shell and navigation
- Subscription, one-time payment, payment receipt, refund, and order logic
- Coach availability, class types, replacements, calendars, reminders, and class membership
- Business/visitor/lead/coach analytics
- CRM, contacts, workflows, inbox, email, OTP, and automation logic
- Student Stories, Brand Settings, banners, public coach cards, SEO, and static asset routes

No production deployment was performed from this workspace. The deliverable is the verified
complete replacement source package.

