# V16.82 Automation Help, Trial Email & Diagnostic Add-on

V16.82 is an additive release on V16.81. It preserves the current theme, automation delivery logic, checkout behavior, Google Drive link storage, lead matching, and D1 safeguards.

## Branded plan / offer email

- Customer-facing preview and delivered email now show the label **Trial Offer** without the number of trial days, months, or years.
- The trial callout keeps **Try for just ₹…** as the prominent value on the right.
- When a trial is active, the original price and enabled offer price remain struck through.
- When no trial is active, the existing original/offer price presentation remains unchanged.
- Live availability and the personalized **View Offer** checkout continue to refresh at delivery time.

## Integration recovery

- Recovery is now gated by an actual connection/authentication/configuration failure signal.
- Ordinary activation validation, including “Step 1: write the WhatsApp message,” is explicitly excluded and receives no integration button.
- Genuine failures still support Google Drive, social, email, payment, SEO, advertising, AI, and external API recovery targets.
- Clicking recovery exits either full-screen automation workspace, opens Integrations, selects the exact category/card, scrolls to it, and applies the existing temporary focus highlight.

## Activation diagnostics

- The bottom-right activation card now separates its title, explanation, and step-by-step list.
- Existing high-contrast yellow highlights remain on incomplete fields and blocks.
- Draft saving remains available while Active is off; invalid active flows remain blocked.

## Automation Help & Instructions

Each platform library now has a themed circular `i` button immediately before **New Flow**. The front grid flips to a help face and the circular back control returns to the grid.

The guide is generated for the selected automation type and platform:

- **Chatbot DM:** triggers, all message formats, quick replies, interactive URL/call actions, Question, Condition, Set Attribute, API Request, optional AI Bot, Human Handoff, End Flow, WhatsApp Template, and WhatsApp Pay where applicable.
- **Chatbot Comments:** comment trigger/reply, Condition, Set Attribute, API Request, and End Flow.
- **Comment Triggers DM:** keyword, rotating public variations, fixed delay choices, one initial private response, uploads, live Plan/Offer, stored attributes, API checks, and continuation through Chatbot DM after the recipient replies.
- **Lead Nurturing:** sources, step timing, WhatsApp/email/SMS content, branded email preview, attachments/buttons, live Plan/Offer, Stop After Purchase, repeat rules, wire disconnection, and activation validation.

## D1 observation only

Recorded at **5 September 2026, 12:37 AM IST**:

- Rows read: **2.02 million**
- Rows written: **5.93 thousand**

V16.82 does not modify `functions/_lib/d1-read-budget.js`, any D1 safeguard, any read threshold, or any migration. The file SHA-256 remains `5a3efb45f8d2b6b27dacce279146f831f603407082a79e4258d1a826523d2f43`, and migration 0037 remains the latest migration.
