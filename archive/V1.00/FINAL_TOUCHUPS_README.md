# Urgent Casting – Unified Client CRM / Search / Checkout Touch-ups

This is a complete replacement package based on the current Urgent Casting project. The existing public/admin logic remains in place; the new work is implemented as additive routes, schema upgrades, CSS and a last-loaded admin CRM enhancement layer.

## Latest changes included

- Contact form Country Code and WhatsApp Number now share aligned label, control and helper rows. `+91 India` remains selected by default and the country helper reads `+91 for India.`
- Any public `Add to Cart` action saves the selected service and immediately opens `/checkout`.
- Checkout keeps the existing order summary and adds a compact `+ Add More Services` action linking back to `/offers`.
- Admin sidebar has a standalone `Search` item immediately below Dashboard.
- Search supports name, phone, email, Order ID, Payment ID, Subscription ID and From/To date range.
- Dashboard lead lists use compact CRM cards with Urgent Casting colours, status/interest chips, website visits, services, latest visit, phone, next action, follow-up date, page-interest chips and pending/paid amount.
- Page-interest chips are ordered by time spent and visits: the strongest page appears first in green; the least-used displayed page is orange. Hovering a chip shows visits and tracked time without cluttering the card.
- One unified `Client Details` modal is used from Dashboard lists, Enquiries, Orders, Refund Records, Subscribers and Unsubscribed/Inactive customers.
- Client Details includes Website Visits, Time Spent, Services, Pending/Paid Amount, First Visit, Last Visit and ordered page-interest chips.
- Client actions: Edit Client, Add Follow-up, Add Order, Generate Payment, Add Payment, Download Details and Delete Client.
- Client tabs are `Summary`, `History`, and `Payments`; the B2B Projects tab is intentionally not used.
- Edit Client uses the B2C fields relevant to Urgent Casting. Name and WhatsApp fields have matched helper rows so the form remains aligned.
- Follow-up history records calls/WhatsApp/contact outcomes, next follow-up date, next action, staff member, discussion and notes.
- Generate Payment provides QR, Payment Link, Subscription and Customized Subscription Plan workflows with client identity prefilled.
- Manual Add Payment is included without screenshot storage.
- Payments tab includes linked subscriptions, refresh, pause/resume/cancel actions and payment records with the existing 20/50/100 pagination convention.
- Additive D1 CRM tables/columns are created automatically by `ensureSchema()`; no manual SQL is required for these additions.

## Compatibility

The reference Instautomate CRM was used only for information architecture and interaction flow. Urgent Casting remains Cloudflare Pages + Functions + D1, uses its own wine/gold/pink design, and does not import the Apps Script/Google Sheets implementation.
