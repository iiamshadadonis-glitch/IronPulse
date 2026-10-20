# V16.78 — Comment-to-DM sequences and lead-nurturing timeline

This replacement is additive to V16.77. Existing visual colors, saved flows,
integrations, inbox logic, CRM records, posting tools and D1 safeguards remain
in place.

## Comment Triggers DM

- Shows only enabled platforms that expose the required comment-private-reply
  capability. In the current integrations those are Facebook and Instagram.
- Adds Comment Reply, preset Delay, rich Private DM, PDF / Document and Plan /
  Offer blocks.
- Public replies support one to ten variations. A single atomic cursor rotates
  them in saved order and restarts at variation one.
- Delay blocks accept only 5, 10, 15, 20, 25 or 30 seconds.
- Private replies support text, remote image/document links, quick replies,
  interactive buttons, image plus buttons and a live plan/offer attachment.
- Document bytes are never copied into D1 or Cloudflare storage. Only the
  administrator-provided HTTPS reference is retained in the flow definition.
- Plan price, purchase link and remaining availability are resolved from the
  current plan and paid-order records immediately before delivery.

## Automation canvas

- Every connected dotted wire now has a small midpoint × control. Clicking it
  clears the exact stored source connection without deleting either block.

## Lead Nurturing

- Removes the internal database-budget explanation from the admin interface.
- Replaces the horizontal legacy step cards with a scrollable timeline using
  capsule inputs, properly padded selects and a permanently visible Save Flow
  action.
- Lead sources come from the currently enabled integrations, plus Website and
  Contact Form. Existing saved source values remain editable even if an
  integration is temporarily disabled.
- WhatsApp, email and SMS steps support text, image, remote document, link,
  interactive-button, image-button and live plan/offer content.
- Timeline connections can be disconnected and reconnected. A disconnected
  step ends that enrollment after the step is delivered.
- Existing repeat and stop-after-purchase behavior remains active.

## Identity enrichment

- Inbound messages can capture explicit email, phone and supported social-ID
  labels. When an administrator asks for one of those fields, the next concise
  reply can populate that field.
- A social ID already attached to another lead moves the conversation identity
  to the canonical lead and closes the duplicate lead without deleting it.

## Deployment

Apply `migrations/0037_v16_78_comment_dm_lead_timeline.sql` after deploying the
replacement. The runtime also creates the small rotation table defensively.

Run `npm run test:v16.78` for this release, followed by the retained V16.77 and
V16.76 regression suites.
