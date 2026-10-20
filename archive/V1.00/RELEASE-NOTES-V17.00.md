# Urgent Casting V17.00

## Visitors and repeat visitors

- Shows the first five visited pages as themed clickable badges.
- Places additional pages behind one **Show more** disclosure so long journeys no longer make the dialog excessively tall.
- Opens each page safely in a new tab and displays its full destination URL on hover.
- Uses the compact **Blog** label for every blog URL while keeping each exact article URL as the click and Excel hyperlink target.
- Preserves the identity order: name, mobile number, IP address, location and device ID; anonymous records start with the IP address.
- Enriches new visitor rows with Cloudflare edge city, region code and country code when those fields are available. Historical rows are not guessed or overwritten.
- Keeps the same behavior in both Visitors and Repeat Visitors, including Excel-compatible exports.
- Corrects the `querySelector is not a function` modal failure caused by passing a selector string where a DOM root element was required.

## Automatic branded emails

- Editing is locked by default behind an **Enable Editing** switch.
- Every email card has its own Help, Preview Email, Revert to Original and Save Template actions.
- Save Template first opens a side-by-side **Original / Currently Saved** versus **Edited Version** review.
- Continuing opens a separate warning confirmation. The Cancel action is visually emphasized and focused by default.
- Revert restores the factory-crafted template in the editor and still requires the same review and confirmation before it can be saved.
- The live automatic email workflows remain enabled regardless of the editing lock.

## Checkout notifications

- Adds **Payment & Meeting Notifications** under Brand Settings → Checkout.
- Email and WhatsApp destinations have independent enable switches and connection-state guidance.
- Existing order/payment webhook logic now uses the saved administrator destinations for new orders, successful or failed payments, renewals and cancellations.
- The existing webinar-reminder processor also sends a 15-minute administrator reminder. Email includes the attendee-list PDF; WhatsApp Cloud includes the PDF document when supported, with a safe text fallback for providers without document upload.
- Retry fingerprints suppress duplicate provider webhook alerts.

## D1 read controls

- Public site, bootstrap, products and blog endpoints use explicit two-minute edge response caching, even when an old browser script adds a cache-busting query string.
- The visitor modal's list/export mode no longer runs its four unused summary/source/page scans.
- Adds visitor/contact lookup indexes through the existing self-healing schema initializer.
- No manual D1 migration command is required.

## Operational note

The 15-minute meeting notification is processed by the existing `/api/automation/webinar-reminders` automation. Keep the existing scheduled automation active. No new schedule, migration, or database is introduced by V17.00.
