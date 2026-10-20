# V16.81 — Integration Recovery and Flow Validation

## What changed

### Clickable integration diagnostics

Integration diagnostics can now carry a structured recovery target containing the Integrations category, card key, label and admin URL. The admin UI also recognizes legacy solution-oriented integration errors as a safe fallback.

When an integration request fails, the diagnostic provides an **Open … Integration** action. Activating it:

1. opens **Settings → Integrations**;
2. selects Social Media, SEO, Storage, Email & OTP, Payments, Ad Networks, AI Integrations or API Settings;
3. expands and scrolls to the exact integration card where available; and
4. temporarily highlights the destination card.

Google Drive uploads explicitly report disabled Drive, missing OAuth authorization, a missing root folder, revoked/expired authentication, API-key failures and Drive permission/API failures. The returned diagnostic points to **Storage → Google Drive API**.

### Lead Nurturing activation safety

- A newly created WhatsApp introduction starts with an empty message field. The suggested variables remain in the placeholder only.
- WhatsApp, email and SMS steps all require a non-empty message before activation.
- Email steps continue to require subject, badge and title.
- Required image, document, link, offer and button content remains validated by content type.
- Drafts can be saved while incomplete, but incomplete flows cannot be enabled.
- Server validation is authoritative. Structured validation fields returned by the server are reapplied to the matching client card/field.

### Yellow flow-error highlighting

Invalid blocks and fields in Lead Nurturing and Comment Triggers DM now use a high-contrast yellow/amber outline and pale-yellow field background. This styling is scoped to the automation workspaces and does not modify the existing red brand theme.

## D1 scope

V16.81 intentionally makes no changes to the D1 read safeguards, query thresholds, database schema or migrations. The observation supplied for later comparison is:

- 4 September 2026, 10:44 PM IST
- Rows read: 1.7 million
- Rows written: 4.82 thousand

## Deployment

Deploy the complete replacement normally. No new D1 migration is required for V16.81.
