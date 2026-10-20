# V1.44 — completed fixes
Baseline: the supplied complete V1.43 replacement. This release adds mobile presentation adapters; existing save, connection, schedule, upload, ordering and delete handlers remain in charge.

## Webinars / Schedule
- Added mobile gutters around Studio Schedule and inner container padding.
- Replaced the inline Teaching Days checkbox stack with a compact navigation row, selected-day summary and the shared seven-day multi-select bottom sheet.
- Kept the original weekday checkboxes and classDays payload, including the combined coach-and-schedule flow.

## Lead Email Follow-up
- Compressed automation templates into two columns on mobile.
- Padded the canvas header and kept Preview, Active and Save in one horizontal action row.
- Increased workflow insertion touch targets to 44px and raised them above connection lines.
- Add Step opens the shared bottom sheet and delegates to the original workflow insertion function.

## Settings / Pages
- Existing-page rows open Edit this Page / Delete this Page actions. Edit opens the existing full-screen Editor / Review form; Delete opens the original confirmation above the sheet.
- Add / Edit FAQ opens directly in a two-step full-screen wizard with padded fields.
- Header Preview uses swipeable navigation pills, with its redundant mobile logo/title hidden.
- Header Order rows contain the number, editable menu label and compact Up / Down / Pencil actions in one row. Original menu ordering, slug editing, submenus and locked Home rules remain available.

## Settings / Integrations
- Removed the mobile global header action clutter; contextual help is inside each configuration form.
- Added width-aware category tabs with a final More menu containing the remaining categories.
- Replaced provider accordion navigation with consistent disclosure rows.
- Added provider action sheets exposing Edit, available Connect / Test / Disconnect actions and provider-specific token or manual actions. Save-only providers open their editor directly.
- Configuration opens in the shared full-screen wizard, with a separate read-only Review step and the original Save / Connect action in its footer.
- Retained enabled controls, callback copying and source field bindings. Credential review displays presence rather than secret values.
- Covered Social Media, SEO, Storage, Email & OTP, Payments, Ad Networks, Marketing, AI, API Settings and Webinars, including connected-provider Edit links.
- Included legacy Blogger/API controls and the advanced Marketing Integrations providers in the same mobile workflow.
- Converted connected capability/status records into compact mobile cards.

## Regression fixes and delivery
- Corrected a repeated mobile initializer and an integration final-action argument mismatch found during browser regression.
- Rebuilds wizard groups when an existing form replaces its field DOM, preventing stale steps after changing class/coach mode.
- Preserved V1.43 Sales, image uploads/cropping/reordering, product placements, mobile member cards, social forms, flow builders, client details and shared Coach / Student behavior.
- Mobile rules use the existing 760px dashboard breakpoint and existing theme variables. Desktop controls and accordions are restored on wider viewports.
- V1.44 asset URLs and middleware deliver one current mobile controller, with no-store dashboard HTML.
- No new database migration, reset, payment/refund processing or authentication change is included.

See DANCE-STUDIO-V1.44-VERIFICATION.md for executed checks and their limits.

