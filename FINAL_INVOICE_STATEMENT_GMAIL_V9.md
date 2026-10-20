# Urgent Casting — Invoice, Statement & Gmail V9

This build is based on the supplied `urgent-casting-help-layout-tracking-payments-storage-final-v8(1).zip` and keeps the existing admin/checkout/payment logic intact. V9 adds document and email functionality around the existing Client Details CRM.

## Client Details

- **Generate Invoice** is added beside the existing payment actions.
- Invoice fields are prefilled from the client's earliest recorded payment after a live gateway refresh is attempted.
- The invoice remains editable before PDF generation.
- The PDF uses the saved Urgent Casting logo plus current Primary and Accent colors from Site Settings.
- **Payments → Send Statement** opens a dedicated statement dialog with 1, 3, 6 and 12 month periods plus Custom Date.
- Apply / Refresh reuses the existing multi-gateway client refresh logic. If a gateway is temporarily unavailable, saved CRM payment records remain usable.
- Statement rows show only Payment Date, Plan / Offer, Payment Mode, Amount Paid, PG and Transaction Reference.
- Invoice and statement PDFs can be downloaded, sent through the configured WhatsApp provider, or sent through connected Gmail.
- Missing client phone/email disables the corresponding send button.
- Long-running actions show visible progress and return success/error messages.

## Gmail / Email

Open **Settings → Social Media → Gmail / Email**.

1. Create/select a Google Cloud project: https://console.cloud.google.com/
2. Enable Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
3. Create a Web OAuth client: https://console.cloud.google.com/apis/credentials
4. Copy the OAuth Redirect URL shown by the admin card into **Authorized redirect URIs**.
5. Save Client ID + Client Secret, then click **Connect Gmail**.
6. The connected Google account becomes the actual sender.
7. Set **Admin Copy Email** if the admin should receive a copy of invoices/statements.

The implementation uses Gmail OAuth and the Gmail send API. No normal `mailto:` action is used for these document sends.

## WhatsApp document delivery

The document endpoint reuses the WhatsApp provider already configured in the website:

- WhatsApp Cloud API, or
- GAPI / GREEN-API.

If Gmail + Admin Copy Email are configured, a WhatsApp invoice/statement send also emails an admin copy of the PDF.

## Site Settings → Legal Entity

A new collapsed **Legal Entity** card stores:

- Enable Legal Entity on Documents
- Organization / Legal Name
- Legal Address

When enabled, these values prefill generated invoices. They remain editable in the invoice dialog. Leaving both fields empty omits the legal footer from that PDF.

## Payment Records layout

The existing payment-record table data is unchanged. V9 only adds layout rules so:

- headers remain on one line,
- the table scrolls horizontally,
- columns have fixed sensible widths, and
- a wrapped cell expands the whole table row consistently.

## No database migration required

Gmail and legal-entity configuration are stored inside the existing settings JSON records, so no new D1 schema migration is required for V9.
