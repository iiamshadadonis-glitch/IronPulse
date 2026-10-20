# DropBeat Dance Studio V1.30 release notes

## Dark-mode completion

- Adds one final, dark-only Admin stylesheet after every legacy stylesheet.
- Repairs body-level modal dialogs that sit outside `#adminApp`, including Add/Edit Plan or Offer, Client Details, Contact Details, Coach Details and analytics detail dialogs.
- Repairs the reported Plan Class/Event Details, reminder and next-step panels without changing their fields, behavior or layout.
- Repairs Product Display choices, CRM information grids, contact information grids, webinar coach cards, attendance calendars, attendance metrics and coach-detail metrics.
- Repairs Growth Analytics controls, charts, legends, summaries and detail cards, plus Calendar cells, list rows and summary metrics.
- Analytics canvas labels, axes, grid lines and small pie labels now repaint with readable dark colours when colour mode changes. Existing chart data and series colours are unchanged.
- Repairs Social Posts scheduling calendars, video upload/platform choices, Pages header preview/order rows, Approvals cards, Dance Tips advertisement rows and the Website Colors editor surfaces.
- Adds broad late-rendered grid/workspace coverage so newly mounted Admin cards inherit the same dark neutral surfaces.

## Public pages

- Restores the visible “About DropBeat Dance Studio” heading in dark mode by resetting the legacy transparent text paint only in dark mode.
- Completes dark surfaces and readable text for Dance Tips list and article pages.
- Adds a resilient colour-mode control that recreates the compact sun/moon button if dynamic navigation replaces the header.
- Adds the same dark assets directly to dynamically rendered Blog and custom-page shells, with middleware fallback for all public HTML.

## Light mode and logic preservation

- The established light-mode stylesheets remain byte-for-byte identical to V1.29.
- No plan, payment, login, checkout, coupon, schedule, attendance, CRM, coach, automation, email, D1 schema or migration logic is changed.
- Existing brand primary/accent colours and semantic paid/failed/cancelled/refund colours remain authoritative.

