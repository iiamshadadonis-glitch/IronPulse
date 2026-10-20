# V1.45 verification

Final verification results and archive identity are recorded in `verification/v1.45/` and `V1.45-RELEASE-MANIFEST.json`.

## Executed checks

The release is tested with Node 24.19.0, local SQLite and Chromium 153.0.8010.0. The source/database command is `npm run test:dance-v1.45` (23 suites). The browser command is `npm run test:dance-v1.45:browser` (six suites: browser, components, workflows, additions, native and polish).

The final validation checks the separately extracted complete release-candidate project, not an unrelated demo. Archive CRC and extracted file hashes are compared against the working project. The final manifest records full baseline retention and the unchanged server files.

## New V1.45 browser coverage

- Sales Create Subscription row alignment and unchanged full-screen navigation.
- Visitors / Repeat Visitors bottom clearance, separate non-overlapping Traffic Sources cards and hidden mobile headers.
- No duplicate mobile FAQ launcher, plus desktop restoration.
- Saved Gmail email strings preserved in Review, with no idle summary DOM mutations; changed inputs update the next Review.
- Marketing / Webinars / API header alignment; endpoint URL and full-width copy action; original copy callback.
- Profile save payload, original input identity, native file controls and draft-preserving legal details.
- Website Colors / Theme segmented navigation, actual theme-card selection, read-only summary and original settings save payload.
- Brand configuration rows, full-screen dimensions, contextual help, final Review and close behavior across all Brand modes.
- Email action sheet, preview above the sheet, editor / Review and original guarded save comparison. No email template is committed without its original confirmation.
- Banner / Coupon status and action cards, Checkout subview visibility and Safe Cleanup cards / original Review action.
- Desktop form/accordion restoration and mobile overflow checks at 320px, 390px and 430px.
- Shared single-arrow refresh path, existing dimensions and brand color; shared portal behavior retained.

## Retained regression coverage

Dashboard stability and two-card metric carousels; client summary/details; visitors/subscription/payment list cards; search/filter sheets and odd/even fields; charts, legends, active-context help and calendars; statement/invoice/refund layering and original local PDF generation; Sales subscription/one-time/plan wizards; Product Images upload/crop/preview/order/save bindings; placements; Current/Past Members; social post/carousel/poll forms and uploads; automation triggers and flow insertion; Dance Tips/advertisements; Pages/New Page/Custom Code; stories; Approvals; Tracking; Heat Maps; schedule gutters and Teaching Days; all integration categories, masked credentials and source save payloads; Coach / Student shared forms.

The real SQLite import suite covers current sample CSV, quoted fields, create/update, billing/trial/capacity settings, class mapping, image URLs, placements, retries, invalid rows, duplicate SKUs, legacy CSV and authorization.

## Scope and practical limits

Browser tests intercept API requests with synthetic records and block external requests. No production login, real gateway refund, OAuth connection, social publication, automation activation or live email is performed. Authentication, integration server handlers, database schema and payment/refund processing are unchanged. No new migration or database reset is required.

Use Node 22.13 or newer for the SQLite tests. Browser checks require Playwright and a compatible Chromium; external installations can be selected with `DROPBEAT_PLAYWRIGHT_MODULE` and `DROPBEAT_CHROMIUM_PATH`. `DROPBEAT_TEST_ROOT` can point to the separately extracted project and `DROPBEAT_TEST_OUTPUT` selects a temporary evidence directory.

The package includes text verification logs and empty error reports from the final runs. Screenshots are used for internal visual review and are not included in the replacement.
