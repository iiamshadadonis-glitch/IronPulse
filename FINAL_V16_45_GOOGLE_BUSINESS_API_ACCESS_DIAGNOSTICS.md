# V16.45 — Google Business Profile API Access Diagnostics

This additive release keeps the existing website theme and business logic intact while correcting Google Business Profile setup/diagnostic behavior.

## What changed

- Google OAuth connection is now shown separately from Business Profile API project approval. A saved refresh token/email is labeled **OAuth connected** until the Business Profile APIs pass live checks.
- HTTP 429 from Business Profile account/location discovery now explains the Google project approval/quota requirement instead of implying that the OAuth Client ID or Google login is necessarily wrong.
- Account/location discovery records individual readiness for:
  - My Business Account Management API
  - My Business Business Information API
  - Google My Business API Posts/Reviews (verified by Test Connection after a location is selected)
- OAuth return now attempts account discovery rather than immediately running a location-dependent Posts test.
- Test Connection can perform a partial account-discovery check when no account/location has been selected yet, then asks the admin to select/save a location before the full Posts/Reviews live test.
- The Google Business Profile helper card now links to Google's prerequisites/basic-setup documentation and explains Basic API Access, quota 0, required APIs, OAuth callback setup, supported Posts/Reviews actions, and API limitations.
- Persistent saved GBP errors are no longer rendered as a red box on every ordinary page refresh; explicit Connect/Load/Test actions still surface their transient diagnostic/capability result.
- Google Business local-post image payloads now include `mediaFormat: PHOTO`, matching the current Google Business Profile Local Posts API format.
- No CSS/theme files were modified.

## Important Google-side requirement

Enabling **My Business Account Management API** is correct but is not sufficient by itself. Google currently requires project-level Business Profile API approval. If a Business Profile API quota is 0, the project has not yet been granted Basic API Access. After approval, enable the Business Profile APIs in the same Google Cloud project as the OAuth Client ID.
