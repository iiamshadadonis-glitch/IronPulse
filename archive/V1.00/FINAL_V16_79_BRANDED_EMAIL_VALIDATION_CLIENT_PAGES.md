# V16.79 — Branded Email, Validation and Client Page History

## Delivered changes

- Client Details always shows **Most Visited Website Pages** in its own bordered section. The disclosure arrow and its collapsed state were removed, eliminating overlap with Pending Amount.
- Lead Nurturing email content is rendered through the shared Urgent Casting branded-email component used by payment and invoice emails.
- Email steps show a live recipient preview beside the editor. Subject, badge, title, message, image, document, buttons and plan/offer changes refresh the preview immediately.
- Email images and documents use the existing Google Drive integration. The upload is placed in **Lead Nurturing Automation Email**. The flow stores only the returned link and file name; no file bytes are saved in D1.
- Link content is displayed as a branded call-to-action button, so the destination URL remains behind the button label.
- Plan/offer emails resolve price, destination and availability immediately before delivery. The email summary therefore uses the latest live values.
- Timeline badges update immediately from Wait and Time Unit, with correct singular/plural wording (for example, **After 6 hours**).
- Lead sources use compact spacing without a nested scrollbar. The workspace panel itself remains scrollable when needed.
- Inactive flows may be saved as incomplete drafts. Activating a flow validates required fields, highlights missing inputs/cards, and shows a diagnostic message.
- Activation is also validated by the server for Lead Nurturing, Chatbot DM, Chatbot Comments and Comment Triggers DM. A library-grid switch cannot bypass validation.

## Upload behavior

Accepted lead-nurturing email assets include images, PDF, Word, Excel, PowerPoint, text and CSV files up to 25 MB. Google Drive must already be enabled and connected with a destination root folder. Files are link-shared by the existing Drive integration.

## Database note

V16.79 has no new migration and makes no changes to D1 read-budget limits or safeguards. The observed comparison point supplied before this release was **1.28M rows read** and **3.74K rows written** on 4 September 2026.
