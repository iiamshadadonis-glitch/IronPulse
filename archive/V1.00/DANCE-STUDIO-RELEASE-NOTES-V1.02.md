# DropBeat Dance Studio V1.02

V1.02 is a complete replacement package built on the supplied V1.01 application. It preserves the inherited V17.09 orders, payments, subscriptions, CRM, integrations, automations and database behavior while correcting the reported admin errors and applying the supplied Dropbeat WordPress theme language.

## Admin corrections

- Fixed the `Cannot read properties of null (reading 'querySelector')` login-screen failure by making optional marketing-panel lookups null-safe.
- Prevented email-provider and wrapped business-data loaders from calling protected admin APIs before authentication completes.
- Added an authenticated `dropbeat:admin-ready` lifecycle event so deferred modules initialize after a successful login.
- Kept expected pre-authentication responses from appearing as global runtime-error toasts while preserving real login errors inside the login form.
- Rebuilt the final admin visual override against the real `.side`, `.main`, `.login-overlay` and `.login-card` elements.
- Replaced the inherited maroon/yellow presentation with the supplied Dropbeat colors: `#4B55BE`, `#A469A8`, `#1a1a1a`, `#454545`, `#313131` and neutral white surfaces.

## Frontend theme replacement

- Replaced the prior recolor-only layer with a structural Dropbeat presentation based on the supplied WordPress theme.
- Added a dark stage-style home hero, transparent overlay navigation, floating class-information strip, asymmetric dancer welcome block, numbered studio features and square editorial controls.
- Added the supplied purple dancer masthead and raised white content treatment to internal pages.
- Reworked cards, products, forms, checkout/payment screens, footer and responsive navigation into one consistent Dropbeat system.
- Rebuilt the SSL Certified / Secure HTTPS badge as a high-contrast white badge on the dark footer.
- Verified key foreground/background combinations at a minimum contrast ratio of 6.28:1.

## Trial class form

- The public trial form now asks only for name, date of birth, gender, country code, WhatsApp number, email ID and an optional “Tell us more about yourself” message.
- Removed Instagram ID, occupation, experience, completed classes/performances, goals, style, photo links and video links from the form.
- The existing profile/CRM submission pipeline remains in place. The API validates the date of birth, saves it to the existing contact record and derives the legacy age value for downstream compatibility.
- Existing optional legacy fields remain accepted by the endpoint so integrations are not broken.

## Footer and database corrections

- Corrected “Inst Automate” to “Instautomate” across all static pages, dynamic pages, emails, defaults and fresh-database seeds.
- Added runtime normalization so an existing saved `Inst Automate` footer value is corrected without requiring the old migration to rerun.
- Repaired portable SQL quoting in the dance content seed for current D1/SQLite behavior.
- Centered the design credit and kept it on one line at desktop and mobile widths.

## Compatibility

No payment, order, subscription, refund, CRM, integration, automation, visitor, analytics or notification feature was removed. V1.02 remains compatible with the inherited V17.09 application and the existing `dance-class` Cloudflare Pages/D1 configuration.
