# DropBeat Dance Studio V1.21 Release Notes

## Holidays

- Removes the email/dashboard subject from Upcoming and Past Holiday table rows so the event-name column remains clean.
- Keeps the event name clickable and retains the subject, image, message and dates inside the Holiday Preview dialog.
- Preserves typed newlines, blank lines and paragraphs in previews, portal notices and branded email HTML.
- Hides Event End Date by default and reveals it only through **+ Add an end date**.
- Retains the existing theme and adds only scoped spacing/layout rules.

## Google Drive images

- Converts Drive file IDs, share links and attachment/download URLs to inline thumbnail URLs suitable for browser image elements.
- Preserves a Drive resource key when present.
- Normalizes holiday, coach, student and attendance/profile media at the server boundary.
- Adds a small runtime compatibility repair for older stored Drive image URLs and a safe alternate inline URL if the first Drive image endpoint fails.
- Keeps existing Google Drive upload and public-viewer permissions intact.

## Coach Add/Edit parity

- The active Admin Add/Edit Coach dialog now includes coach name, email, phone/WhatsApp, profile image, designation, badge, biography, experience, Instagram and Facebook.
- Replaces the separate Dance Specialties, Available Days and Class Types controls with repeatable Teaching Availability sessions containing day, From, Until, class type and dance styles.
- Derives the existing legacy capability fields from those sessions before using the established coach-save API, preserving current plan and workspace compatibility.
- Does not add a password to admin-created coach records.
- Uses **+ Sessions** on both the admin editor and coach sign-up.

## Active domain and sitemap

- Request hostname now takes priority over stale configured Pages origins.
- Public HTML replaces legacy Pages links with the active request origin.
- PDF/document logo links use the browser's active origin.
- Search Console property and sitemap values repair stale hosts at read time.
- Static and dynamic robots files point to the standard `/sitemap.xml`; the legacy auditions sitemap route redirects there.

## Gmail identity and permissions

- OAuth requests `openid`, `email` and `gmail.send`, then reads the identity returned by Google.
- Removes the Gmail `users.getProfile` call that produces a 403 under the narrow send-only scope.
- Records a connection only when a refresh token, exact Google identity and Gmail send permission are all verified.
- Clears stale/unverified identity state and prevents email/OTP sending from treating it as connected.
- Preserves a custom-domain sender alias while displaying the actual connected Google account separately.
- Adds actionable reconnect diagnostics for missing scope, revoked grants and insufficient-scope failures.

## Compatibility and safety

- Includes all V1.20 Schedule and Attendance corrections.
- Existing student dashboard logic, payments, memberships, attendance date rules and colour-theme files are unchanged.
- No database table or column is removed and no destructive migration is introduced.
