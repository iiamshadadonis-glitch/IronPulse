# Urgent Casting V14.1 — Build-Safe Correction

This package is based on the known-working V13 project and keeps the V13 Pages Functions file/route topology unchanged.

## Why this correction exists

V14 introduced one additional Pages Function file: `functions/api/admin/not-interested.js`. The Git-connected Cloudflare Pages deployment failed only after the V14 `functions` directory was committed. To reduce deployment risk while preserving the requested V14 behavior, V14.1 removes that additional Function route and places the Not Interested archive read logic inside the already-existing `functions/api/admin/client-crm.js` route.

The admin UI now loads the archive through:

`/api/admin/client-crm?mode=not_interested`

This means the complete V14.1 package should be uploaded together. Do not mix the V14.1 Functions folder with the earlier V14 `final-v14-refunds-lead-lifecycle-polish.js`, because the old V14 frontend called the removed `/api/admin/not-interested` endpoint.

## V13 topology preserved

- V13 JavaScript files under `functions/`: 85
- V14.1 JavaScript files under `functions/`: 85
- Function file paths/routes are identical between V13 and V14.1.
- No new Pages Function route was added.

## V14 features retained

- Padded Client Details → Refunds workspace.
- Pre-filled payment/refund details and editable refund amount.
- Same-gateway refund enforcement.
- Refund approval confirmation.
- Automatic refund email when customer email is available.
- Manual refund WhatsApp message.
- Payment / Refund invoice selector and refund PDF/document delivery workflow.
- Gateway customers cannot create new CRM leads; exact phone/email match is required to enrich existing CRM records.
- Converted paid customers are removed from active lead lists.
- Hot Leads age out after 3 days unless still updated as Hot.
- Not Interested / No Response archive with search and Restore Lead.
- One-time successful payments remain one-time users rather than being inserted as subscribers.
- Compact Orders action dropdown and Save button.
- Subscription Overview includes customer name, email, phone, next charge date and next charge amount.

## Offline validation completed

- JavaScript syntax check passed for every `.js` file in `functions/` and `public/`.
- All relative Function imports resolve.
- All named Function imports resolve to exported symbols.
- All local HTML `<script src>` and stylesheet `<link href>` references resolve.
- All SQL migration files parse/apply successfully in SQLite smoke testing.
- Function file topology was compared directly against V13 and is identical.
- ZIP integrity is tested after packaging.

Production payment gateway calls, real refunds, production email delivery and WhatsApp delivery are intentionally not executed during offline validation.
