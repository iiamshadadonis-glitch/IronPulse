# DropBeat Dance Studio V1.14 Release Notes

## Unified Login and Sign Up

- Renamed every public **Admin Login** navigation item to **Login**.
- Added one responsive, side-by-side Login and Sign Up page.
- Added Student Sign Up and Coach Sign Up flows.
- Added role-aware routing to the existing admin dashboard, new student dashboard or new coach dashboard.
- Added secure PBKDF2 password storage, HTTP-only sessions and real Google OAuth login/account connection.

## Student dashboard

- Approval/payment-match status.
- Current assigned classes, coach, dance styles, days, time and duration.
- Seven-day schedule with leave, holiday and cancellation notices.
- Secure Google Meet join window from five minutes before class through class end.
- Profile/photo, email, username, password and private dashboard-colour settings.
- One-time mobile Google Meet installation notice.

## Coach dashboard

- Approval status, profile and availability editing.
- Assigned classes, student totals and seven-day schedule.
- Secure session start for assigned online classes.
- Add/change/remove schedule requests requiring administrator approval.
- Profile/photo, credentials, social links, specialties, availability, class types and private dashboard colours.

## Admin approvals and coach lifecycle

- Added **Settings → Approval**.
- Added Coach Applications, Student Approvals, Schedule Requests, Current Coaches and Past Coaches.
- Added profile-style View modals, Edit, Approve, typed-REMOVE deletion, replacement-coach enforcement and Reactivate.
- Added Current/Past/Awaiting lifecycle access to Pages → Coaches & Founding Team.
- Pending coaches remain private; approved coaches are synchronized into the existing public coach system.

## Google and email corrections

- Removed the obsolete “coding access” Google Login message and Login Guidance card.
- Added real Google consent redirects for admin, student and coach accounts.
- Added real admin email-change confirmation delivery through the configured Email & OTP provider.
- Added precise diagnostics when no OTP-enabled email sender is connected.

## Compatibility and safety

- Existing public theme, admin theme, products, payments, class mappings and admin logic remain authoritative.
- New database objects are additive and self-preparing.
- Public data caches are purged after approved coach/profile changes.
- Private account pages and APIs are no-index/no-cache.

