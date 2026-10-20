# Urgent Casting V16.33 — Client Payments + Google Drive Product Upload

This release is additive to V16.32 and preserves the existing visual theme, checkout, payment, plan/offer, crop, social-status, and recommendation workflows.

## Client Details → Payments

- Numeric gateway timestamps are interpreted correctly as Unix seconds/milliseconds instead of being displayed as raw numbers.
- Subscription cards now label and display **Next Charge Date** and **Last Charge Date**.
- Next charge is taken from the live payment-gateway subscription object when refreshed, with the saved subscription cache as fallback.
- Last charge is taken from actual paid receipts/invoices/payment records; an arbitrary database update timestamp is no longer presented as a payment date.
- Client action buttons are moved to a sticky footer at the bottom of the Client Details modal.
- Payment Records has its own bounded vertical scroll area while retaining horizontal scrolling.
- Not Interested is hidden while a client has a received one-time payment or a non-terminal paid/authenticated subscription. It can return after a subscription reaches a terminal/cancelled state.

## Google Drive Product Image Upload

Google Drive API keys can read eligible public Drive metadata, but Google Drive file creation/upload requires OAuth authorization. V16.33 therefore keeps the API-key diagnostics and adds a Google OAuth upload connection.

- Google Drive card now supports an OAuth Client ID/Secret, OAuth callback URL, destination root folder URL, connected account, root folder name, and Plans and Offers child folder.
- The OAuth app can be entered on the Drive card or the existing Search Console/Gmail OAuth client can be reused.
- Test Connection verifies the configured root folder and creates/reuses exactly one child folder named **Plans and Offers**.
- Uploaded product files are stored in that child folder and made readable by link.
- When Drive is enabled and upload authorization is ready, Plans & Offers → Images replaces Product Image URL with **Upload Product Image**.
- After upload, the existing Product Image save and 900 × 1100 website crop workflow runs unchanged.
- The original Drive image remains the source for Offer Details; the manually cropped image remains the website-card image.
- Story / Status Image URL remains separate and unchanged.
- If Drive upload authorization is disabled/not ready, Product Image URL remains available as the fallback.

## Existing logic preserved

No existing CSS file was edited. V16.33 adds one new CSS file for the sticky Client Details footer, bounded payment-record scrolling, and the Drive upload field.
