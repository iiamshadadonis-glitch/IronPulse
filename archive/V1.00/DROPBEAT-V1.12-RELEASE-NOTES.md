# DropBeat Dance Studio V1.12

V1.12 is an additive replacement release based on V1.11. Existing payment,
subscription, checkout, class, coach, CRM, analytics, reminder, brand, SEO, and
public-site behavior is preserved.

## Sales opens correctly after refresh

- Business Ops → Sales is created before the first navigation request.
- The old multi-second delayed Sales initializer has been removed.
- A safe recovery hook restores the Sales workspace if a legacy script redraws
  the admin navigation during startup.
- The first Sales click after a refreshed admin page now uses the same route as
  every later click instead of displaying an empty panel.

## One complete coach directory

- Settings → Pages → Coaches & Founding Team always uses the complete,
  non-archived coach directory.
- Online Classes, Offline Classes, and Demo / Webinar continue to show only the
  coaches who conduct that class type.
- Loading a class-specific workspace can no longer overwrite the complete coach
  directory with its filtered result.
- Every active coach remains available in Add/Edit Plan, Create Subscription,
  and One-Time Payment.

## Coach-owned dance specialties

- Add Coach and Edit Coach retain the full dance-specialty list for onboarding.
- After a coach is selected in Add/Edit Plan, Create Subscription, or One-Time
  Payment, only that coach's saved specialties are displayed.
- Unsupported specialties are hidden and automatically deselected when the
  selected coach changes.
- Browser validation and independent server validation both reject a style the
  selected coach does not teach.
- Existing coach availability, class-type, class-day, and public-start-date
  safeguards remain active.

## Dynamic brand identity

- The saved Brand Name, Logo, and Tagline are reapplied after settings load and
  immediately after a Brand Settings save.
- Public and admin runtime branding also repairs shortened legacy wording such
  as “DropBeat Studio” using the saved full brand name.
- Public plan guidance, metadata, structured data, and visible helper text use
  the current brand identity instead of a separately hard-coded display name.

## Public typography and plan features

- The main plan title on every Offer Details page has a smaller, calmer heading
  size while retaining the existing visual hierarchy.
- Every Plan Feature field has a hard 80-character limit.
- A live `0 / 80` style counter appears inside each feature field.
- The API independently trims each saved feature to 80 characters.

## Cache safety

- Admin and public enhancement assets use V1.12 filenames and cache keys.
- Dynamic blog and custom-page HTML emits the same V1.12 cache version.
- V1.12 uses the existing database schema and adds no new migration.

