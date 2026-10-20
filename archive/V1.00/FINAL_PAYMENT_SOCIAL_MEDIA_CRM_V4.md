# Urgent Casting – Payments + Social Media CRM Follow-up V4

This package is based on the supplied V3 project. The changes are intentionally additive and limited to the requested Payments UI, Social Media integrations, and Client Details visibility.

## Payments UI

- Removed the global **Disable All Payment Gateways** control.
- Restored compact enable/fallback toggle capsules instead of full-width toggle boxes.
- `Primary`, `Secondary`, and dynamic `Tertiary` role helper text sits below the compact capsule, not inside it.
- Razorpay, PhonePe and Stripe remain separate collapsible cards with individual Save buttons.
- Only one gateway can be Primary. When Razorpay is Primary, PhonePe can be the Secondary fallback and Stripe becomes Tertiary when PhonePe fallback is also enabled.
- Gateway cards remain collapsed when Payments is opened/refreshed.

## Settings → Social Media

A new **Social Media** settings panel has been added with separate collapsible cards for:

- Facebook Lead Ads
- Instagram Lead Ads
- WhatsApp Webhook & Order OTP
- LinkedIn Lead Gen Forms
- X / Twitter activity webhooks

The existing WhatsApp webhook/OTP settings were moved visually from Payments to Social Media while keeping the existing stored settings and OTP behaviour compatible.

## Social leads → existing CRM

Incoming supported social lead/message events use the existing CRM merge logic. A social submission can therefore create or match a `contact_leads` record and appear through the existing dashboard/enquiry/client-detail flows.

Known identity/profile values such as name, phone, email, Instagram ID (only when the platform/form actually supplies it), occupation and other mapped fields fill empty CRM fields. Existing non-empty conflicting identity values continue to use the project's existing candidate-review protection instead of being overwritten silently.

## Client Details

- Summary exposes the lead source and campaign/form/source detail.
- Profile is always visible even before the dedicated profile form is submitted.
- Known contact/profile values are shown; missing values remain `-`.
- Social lead submissions are identified as social-media enquiries in History instead of being labelled as website enquiries.

## Database

Migration `0009_social_media_integrations.sql` adds only the `social_webhook_events` audit/deduplication table and indexes. The runtime schema bootstrap contains the same additive table so the current automatic schema-initialization behaviour is preserved.
