# Urgent Casting V10 — Client Documents, Invoice History & Brand Settings

This build is based on the attached V9 project and keeps the existing CRM, payment gateway, subscription, tracking, storage and website logic in place. V10 is an additive polish/update layer plus the document-history table needed for invoice activity.

## Client Details
- Removed the visible **Add Order** button from Client Details. The existing order backend logic remains untouched.
- Kept the main Client Details action bar on one line.
- Added an **Invoice** tab beside Summary / Profile / History / Payments.
- The Invoice tab contains **Generate Invoice** and an invoice activity grid.
- Invoice activity records invoice number, invoice date, generated/sent time, delivery mode, recipient and status.
- Invoice/Statement modal is now always above Client Details and Dashboard/Total Leads modals.

## Invoice
- Prefills customer and earliest available payment information from the current CRM/gateway payment records.
- Uses current Brand Name, logo, Primary Color and Accent Color.
- Status colors: Paid = green, Partially Paid = orange, Unpaid/Failed/Refunded = red.
- Payment terms render as bullets.
- Default terms:
  1. Payments already processed are non-refundable. Please check the Refund & Cancellation Policy page.
  2. The customer may request cancellation or pause through the Contact Us page where supported.
  3. Future charges stop after the applicable cancellation or pause is confirmed.
- Notes are blank by default and print only when the admin enters a note.
- Shows Amount Received in words and Balance Due in words/Nil.
- Download, WhatsApp and Gmail actions show visible working/success/error states.

## Payment Statement
- 1 Month, 3 Months, 6 Months, 1 Year and Custom Date ranges.
- Apply / Refresh visibly refreshes linked gateway records.
- Download remains available even when the selected period has zero payment rows, allowing an empty branded PDF layout to be checked.
- Branded PDF contains logo, generated date, statement period, customer, payment table, membership benefits and closing message.
- WhatsApp/Gmail sends show visible working/success/error states.

## Brand Settings
- Admin label changed from **Site Settings** to **Brand Settings**.
- **Site Name** label changed to **Brand Name**.
- Brand Name, tagline, logo and website colors are reused by public/admin UI and generated invoice/statement documents.
- Public browser title/meta-visible brand text, later-rendered hardcoded brand text and standard brand-logo placeholders are refreshed from saved settings.
- Legal Entity remains optional and is used on invoices only when enabled or manually filled on the invoice.

## Small UI fixes
- Maps & Reviews: **+ Add Location** changed to **+ Location** and kept on one line.
- About Us cover-image heading/helper spacing corrected.
- Admin Information Help heading/helper spacing preserved.

## Database
Migration `0012_document_delivery_history.sql` adds `client_document_history` for invoice/statement activity. The project schema bootstrap also creates it automatically, so existing first-run schema behavior is preserved.

## Uploading more than 100 files to GitHub
GitHub's browser uploader accepts up to 100 files in one upload operation. For this project, the easiest method is GitHub Desktop: clone/open the repository locally, replace/copy the project files into the local repository folder, review Changes, Commit to main, then Push origin. This avoids the browser's 100-file batch limit.

If you insist on GitHub.com → Add file → Upload files, upload the project in batches of no more than 100 files while keeping every file in the correct folder path. Do not flatten folders.
