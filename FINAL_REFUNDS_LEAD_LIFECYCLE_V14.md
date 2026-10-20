# Urgent Casting V14 — Refunds, Lead Lifecycle and Subscription Identity

This release is an additive/minor-update layer over V13. Existing checkout, payment, CRM, order, document and subscription logic remains in place unless a small backend change was required to stop incorrect gateway-to-CRM imports or to support the requested refund workflow.

## Client Details → Refunds

- Refunds now renders inside the padded Client Details body so the content does not collide with the modal edge.
- The refund workspace is always visible, including its Payment Records and Refund History grids when there are no rows.
- Paid payment records appear in a single horizontal scrollable grid with payment date, plan/offer, payment type, gateway, Order ID, Subscription ID, Payment ID and paid amount.
- The selected payment pre-fills Customer, Email, WhatsApp, Payment Gateway, Order ID, Subscription ID, Payment ID, Paid Amount, Refundable Amount and Refund Amount.
- Payment Gateway is informational/locked to the original gateway. Refunds are sent only through the gateway used for the original payment.
- Refund Amount stays editable up to the live refundable balance returned by the gateway lookup.
- Refund requires an approval dialog. The refund amount is emphasized in the Urgent Casting theme color and the dialog shows transaction references plus the expected credit timeline.
- Successful gateway refunds are recorded in refund history and automatically trigger a customer email when an email address is available.
- Refund History includes a manual WhatsApp action that opens the client chat with the refund amount, refund reference and expected-credit message pre-filled.
- Customer-facing guidance states that bank/payment-provider credit can take up to 7 working days.

## Refund invoice

- The Invoice tab now has a separated selector for `Payment Invoice` or `Refund Invoice` beside the Generate Invoice button.
- Payment Invoice continues using the existing first-payment invoice logic.
- Refund Invoice uses the latest recorded refund and includes refund date/time, gateway, Order ID, Subscription ID, Payment ID, Refund ID, original payment, refund amount, status, reason and expected credit timeline.
- Refund invoice can be generated as PDF and can use the existing document-delivery workflow for WhatsApp/Gmail.
- Invoice history combines payment invoices and refund invoices and identifies the invoice type.

## Gateway identity safety

- Payment-gateway subscription/customer fetching no longer creates a new `contact_leads` row.
- Gateway identity is allowed to enrich a CRM lead only when the normalized primary phone number OR exact primary email matches an existing local lead.
- Gateway sync does not match by visitor/device ID, Instagram ID, name or historical candidate values.
- Old gateway-only lead rows created by the previous sync pattern are excluded from Business Dashboard lead counts/lists, so old merchant-account customers do not continue cluttering Total Leads, Hot Leads or Recent Leads.
- Deleting an unwanted local lead no longer causes subscription overview refresh to recreate it from gateway data.
- Gateway-only subscriptions remain visible in the live Subscriptions Overview without being persisted into the CRM.

## Lead lifecycle

- Successfully paid subscription and one-time orders are excluded from Total Leads, Hot Leads and Recent Leads.
- One-time paid orders continue to appear under Customers → One-Time Users and are no longer inserted into Subscribers by new payment webhooks.
- Hot Leads are restricted to explicitly Hot leads updated within the last 3 days.
- Not Interested and No Response-without-a-follow-up are removed from active lead lists while keeping the CRM history.
- Client Details includes a `Not Interested` / `Restore Lead` quick control beside the existing header chips.
- Customers includes a searchable `Not Interested` screen with Open and Restore Lead actions.

## Orders UI

- Order workflow dropdown is now a compact capsule/pill with `In Process`, `Delivered`, and `Completed` options.
- Save is a smaller matching capsule so the Actions column no longer looks packed inside the row.
- Existing Orders / Subscribers also receive the same workflow control while retaining Pause, Resume, Cancel and Refund actions.

## Subscription Overview

- Customer name, email and phone are shown in subscription detail grids when returned by the enabled payment gateway or linked local order.
- Razorpay rows use the gateway customer data and a small best-effort fallback for older subscriptions with missing identity fields.
- The grid now includes `Next Charge Date` and `Next Charge Amount` in addition to the existing charge/status/cycle information.
- The subscription grid remains horizontally scrollable and visible even when empty.

## Validation

- All changed/new JavaScript files are syntax-checked before packaging.
- The final ZIP is archive-tested before delivery.
- Live refund calls, production gateway credentials, actual email delivery and WhatsApp delivery are not executed during offline package validation; those paths use the existing configured production integrations when deployed.
