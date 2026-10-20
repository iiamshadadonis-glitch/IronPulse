# V1.45 — completed fixes

Baseline: the supplied complete V1.44(1).zip. This replacement retains the full application and earlier fixes. The new presentation rules apply at the existing mobile dashboard breakpoint (760px). Original controls, save handlers, validation, gateway/database integrations and saved theme colors remain authoritative.

## Sales, dashboard sheets and shared controls

- Anchored the Create Subscription navigation row directly below the Sales tab bar with normal mobile padding; removed its large centered spacer. It still opens the original full-screen subscription wizard.
- Added at least 24px of bottom clearance, plus larger device safe-area insets where applicable, to shared sheet/form scroll bodies and overview dialogs.
- Fixed the Traffic Sources list's first-card overlap and kept sources as distinct, compact mobile cards.
- Replaced mobile refresh visuals with one shared single-arrow circular SVG using the current brand color, keeping existing icon dimensions and handlers. The main Dashboard's text Refresh exception remains available.
- Removed the duplicate mobile Open FAQs launcher from the DOM. The FAQ chevron row still opens the Editor / Review wizard; desktop restores its original launcher.

## Review stability

- Stopped the language adapter from rewriting saved email addresses inside mobile Review summaries.
- Added private credential presence to read-only summaries without exposing password values; empty optional summaries remain stable.
- Cached each Review's input fingerprint so unchanged forms no longer repeatedly rebuild the summary DOM. Back/edit/Continue still refreshes the summary when values change.
- Preserved edited Legal Entity fields during background presentation passes rather than re-seeding them on every DOM change.
- Corrected nested-field insertion and appearance ownership when the shared settings form has a mobile content wrapper.

## Integrations

- Grouped contextual help and refresh actions at the right edge of the Marketing, API Settings and Webinars section headers, alongside the title.
- Removed the duplicated mobile API subheader and placed the original API refresh action in the contextual header.
- Converted Automation / Webhook Endpoints into mobile cards with the URL above a full-width copy-icon action. Original copy callbacks remain bound.

## Brand Settings

- Converted configuration launchers and section accordions into the shared chevron navigation rows, opening full-screen forms with a separate read-only Review and sticky navigation.
- Covered Profile, Website Colors / Theme, Legal Info, Banners / Studio Images, Social Media links, Checkout, Notifications, Coupons, Maps / Reviews, branded Email templates, Coach Settings and Login / Security forms.
- Retained original Clear / reset actions in the appropriate mobile action sheets, allowing a new record after editing.
- Added intermediary action sheets for forms with additional actions. Email templates expose Edit, Preview Email and Revert to Original, using the existing handlers.
- Raised email previews and the existing original-versus-edited save review / confirmation overlays above their action sheet and form. The original guarded save workflow remains in force.
- Removed orphaned legacy Open launchers after accordion reparenting, preventing duplicate rows and cross-tab actions in Checkout.
- Added Website Colors / Theme and Checkout Behaviour / Notifications / Coupon Codes segmented subviews, compact theme previews and circular dot palette capsules.
- Reused native dashed upload areas for existing Profile, Banner and Gallery file inputs without replacing their field bindings or upload/crop handlers.
- Kept Banner, Coupon and Studio Image Edit actions routed to their full-screen wizard with the original saved data pre-filled.
- Converted Existing Home Banners and Coupon records into mobile cards, retaining visible status, sort and edit/delete controls. Updated the existing grid paginator's mobile row display so it does not undo the card layout.
- Converted Safe Cleanup categories and eligible-record lists into compact cards, retaining original Review, selection and guarded deletion actions.
- Removed the Coach Settings legacy 3D containing block on mobile, so its full-screen wizard starts at the viewport edge; kept desktop card flipping unchanged.
- Restored desktop accordions, appearance tabs, original form fields and record layouts on wider viewports.

## Delivery and preserved functionality

- New V1.45 CSS, controller and shared icon asset URLs load once in Admin, Coach and Student shells. Modified presentation helpers have new build URLs; middleware retains no-store dashboard HTML.
- Earlier Sales, schedule, member, social post/poll, flow-builder, client, invoice, refund, filter, chart, calendar and shared portal behavior is retained and covered by regression tests.
- No database migration, database reset, authentication, payment/refund processing or server integration change is introduced. Only release-delivery middleware changes on the server.

See DANCE-STUDIO-V1.45-VERIFICATION.md for executed checks, fixtures and practical limits.
