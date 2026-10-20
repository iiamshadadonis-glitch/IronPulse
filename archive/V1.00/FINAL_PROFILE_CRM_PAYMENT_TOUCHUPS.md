# Urgent Casting – Final Profile / CRM / Payment Touch-ups

This build is an additive update to the existing Urgent Casting project. Existing website/admin sections and their established business logic are preserved except where the requested client-CRM/profile/payment workflow needed a small extension.

## Client cards and unified Client Details

- Removes duplicate status badges such as `Hot / Hot`.
- Dashboard client cards now show Email, Phone, Next Action and Follow-up Date; the latest visit stays in the small top time badge.
- Website-page badges are sorted by tracked time/visits and use one consistent capsule size. Highest-interest page is green; the lowest displayed page uses the low-interest accent.
- Client Details shows WhatsApp + Email together, tracked visits/time, first/last visit, page ranking, a top refresh icon, and Summary / Profile / History / Payments tabs.
- Payment Records headers stay visible even when there are no payment rows.
- History cards are numbered and expandable to show activity time, next follow-up, staff member, notes and reference details.

## Submit Profile and duplicate control

- Public header CTA is now `Submit a Profile` and opens `/submit-profile`.
- Required profile data: Name, Age, Gender, WhatsApp, Email and Instagram ID.
- Optional profile data: occupation, experience, project count, future goal, role interest and Tell Us More About Yourself.
- Profile information appears in the Client Details `Profile` tab and in Edit Client.
- Four-stage identity matching is applied in this order: visitor/device ID -> WhatsApp number -> email -> Instagram ID.
- A match merges the submission into the same lead instead of creating another lead.
- Conflicting submitted values are kept as alternatives. A blinking star marks pending profile/contact changes; Edit Client provides editable datalist choices so the admin can select a saved alternative or enter a corrected value.
- Every contact/profile submission is recorded in client history.

## Follow-up and payment forms

- Add Follow-up no longer asks the admin for today's date; the server records the India date automatically. The form keeps the next follow-up date.
- Helper text is included under every requested input except Notes and is kept to one visual line in the admin UI.
- Standard subscriptions label the amount as Monthly or Yearly depending on the selected billing type.
- Customized monthly billing provides Every 1 Month through Every 11 Months.
- Customized yearly billing provides Every 1 Year through Every 5 Years.
- Add Payment explains No specific order and all payment fields.

## Payment gateway behavior

- Razorpay is attempted first when enabled/configured.
- When both Razorpay and Stripe are enabled/configured, Stripe acts as the secondary gateway for this Client CRM flow. A Razorpay failure automatically retries through Stripe. The existing Stripe-fallback setting remains compatible.
- Razorpay QR creation is displayed inside the Generate Payment dialog when the gateway returns its QR image.
- Stripe QR fallback creates a customer-specific Stripe Payment Link and renders that URL as a QR inside the same dialog.
- Generated payment/subscription links are displayed in the dialog so the admin can open/copy/share them with the client.
- Stripe recurring intervals are limited by Stripe to a maximum of three years. If a requested custom 4- or 5-year recurring interval falls back from Razorpay to Stripe, this build safely creates a one-time Stripe payment link for the current charge and displays a warning instead of pretending that Stripe created an unsupported recurring interval. The intended frequency remains recorded in the CRM.

## Deployment

Replace the current project with this complete folder/ZIP and redeploy to Cloudflare Pages. The D1 schema upgrader is idempotent and adds the new profile/candidate/submission structures automatically. Migration `0007_profile_dedupe_payment_fallback.sql` remains a safe marker so a Wrangler migration run does not try to add the same columns twice.
