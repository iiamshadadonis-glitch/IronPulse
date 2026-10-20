# V16.99 Release Verification

## Automated checks

- `npm run test:v16.99` — passed, including the inherited V16.88–V16.98 regression checks.
- JavaScript syntax validation for the changed browser, API and shared-library files — passed.
- Cloudflare Pages Functions compilation with Wrangler 4.132.0 — passed (`Compiled Worker successfully`).

## Verified behavior

- Visitor and repeat-visitor identity order is Name, Mobile Number, IP Address, Location and Device ID; anonymous rows begin with IP Address.
- Both visitor dialogs expose an Excel-compatible download action beside Close.
- Visitor exports include analytics and advertising consent columns.
- Brand email cards use one SVG disclosure control and suppress native markers.
- Every automatic email template has independent Preview Email and Save Template actions.
- The editor covers the full branded structure and six workflows: schedule confirmation, meeting reminder/follow-up, invoice, payment statement, payment success and payment failure/retry.
- The six sending paths read the saved templates when creating live email HTML.
- Before/after webinar reminders remain event-time based.

## Database and deployment

- This release adds no D1 migration file and requires no manual `npm run d1:migrate:remote` command.
- Deploy the complete replacement normally through the existing Cloudflare Pages workflow.
