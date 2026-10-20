# Urgent Casting V14.5 — Payment Truth, Trial Plans, One-Time Plans & Yearly Plans

This release is an additive update on top of the supplied V14.3 project. Existing checkout, customer, CRM, refund, subscription overview, storage, tracking and payment-gateway structures are retained unless a small payment-state correction was required.

## 1. Payment truth / admin-friendly status

A created subscription or payment link is no longer treated as money received.

Admin payment displays use four simple states:

- **Pending** — link/subscription exists but a successful payment has not been confirmed.
- **Paid** — an actual successful/captured/paid payment record with an amount exists.
- **Failed** — the payment attempt failed or the gateway reports a failure state.
- **Cancelled** — the payment/subscription was cancelled, revoked or expired.

The gateway's technical subscription lifecycle can still be stored internally for gateway actions, but it is not used as proof that money was received.

Invoices and statements follow the same rule. Pending requests show **Pending Payment**; paid records show **Amount Received / Amount Paid**.

## 2. Invoice price breakdown

Invoice data now supports:

- Regular plan value
- Offer savings
- Offer price before coupon
- Coupon savings and coupon code
- Final subscription / one-time charge
- Amount actually received
- Pending payment
- Balance due

The PDF visually shows the listed value against the final price, so customers can understand the savings they received.

## 3. Plan payment type

Sales → Plans & Offers now supports:

- **Subscription** — recurring billing.
- **One-Time Payment** — one charge only; recurring/trial controls are hidden.

A yellow warning is shown when One-Time Payment is selected.

## 4. Trial plans

For Subscription plans, **Enable Trial** reveals:

- **Charge Today ₹** — default ₹1.
- **Trial Length** — selectable number.
- **Trial Unit** — Days / Weeks / Months / Years.

The recurring subscription charge starts after the selected trial duration. Razorpay and Stripe use their supported deferred-start/trial mechanisms. If a configured gateway cannot safely reproduce the paid-trial structure, it is skipped by the existing fallback mechanism rather than silently changing the offer.

Trial help also warns that refunds can only be made against money actually collected. For example, if only ₹1 was collected during the trial and no recurring payment occurred, only that collected payment is available for a direct refund.

## 5. Offer price on/off

**Enable offer price** controls whether the public website shows the discounted offer price.

- Enabled: regular price can be struck out and offer price shown.
- Disabled: only the regular price is shown prominently.
- Trial enabled: regular price and active offer price are struck through and the current trial charge is emphasized as **Try for ₹X**.

This applies to both subscription and one-time catalog items.

## 6. Monthly / Yearly catalog plans

Subscription catalog items can be classified as Monthly or Yearly. A new public **Yearly Plans** page is included, along with a **Yearly Plans Page** choice in Product Display.

If no products are placed on that page, it displays a clean empty-state message and directs visitors to Contact Us.

## 7. Plans & Offers admin grid

The existing grid is preserved with two additive controls:

- Payment-type badge: Subscription / Trial / One-Time.
- Red **×** delete button beside Edit and Images.

Delete shows a confirmation before removing the catalog item and its public placements. Historical order/payment records remain intact for transaction history.

## 8. Product Display reminder

The Plans & Offers screen and plan help now remind the admin that saving a plan does not automatically choose its public page. After saving, use **Sales → Product Display** to place the plan on Home, Membership, Festival Offers or Yearly Plans as required.

## Validation performed

- JavaScript syntax checked with Node for all project JS files.
- All D1 migrations, including migration 0014, applied successfully to a fresh SQLite smoke-test database.
- Relative JS import paths validated.
- Local HTML asset references validated.
- Previous `const lead` Cloudflare build defect remains absent.
- ZIP integrity is checked before delivery.
