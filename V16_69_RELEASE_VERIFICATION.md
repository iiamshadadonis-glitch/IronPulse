# V16.69 Release Verification

## Scope
V16.69 is an additive/minimal Inbox control update on top of the uploaded V16.68 complete replacement.

### Requested behavior implemented
- Inbox shows one themed **Automation** ON/OFF toggle only when at least one enabled DM automation exists for that platform.
- When Automation is ON, manual text entry, emoji, attachment and Send controls are disabled.
- The composer displays **Disable Automation to send messages manually.** while Automation is ON.
- Turning Automation OFF places only that participant into human/manual mode and enables manual replies.
- Turning Automation ON returns that participant to automation mode.
- If no enabled DM flow exists for a platform, the Automation toggle is hidden and manual sending is immediately available.
- Server-side send validation prevents an admin API request from bypassing the UI lock while Automation is ON.

### Incoming media storage behavior verified
- Incoming social Inbox image bytes are not stored in D1.
- The Inbox does not write incoming social media to R2.
- D1 stores the message row plus provider media references/metadata (URL/media ID/MIME/raw webhook metadata).
- `/api/admin/social-dm-media` fetches and streams the provider image on demand.
- Media responses use `Cache-Control: private, max-age=300`, providing only a short browser cache.
- Existing outgoing manual image behavior remains unchanged: when the admin attaches an image, the existing UI uploads it to Google Drive `DM Attachments` first and sends that URL through the selected provider.

## Verification performed
- 280 JavaScript files parsed with `node --check`: 0 syntax errors.
- 310 relative JavaScript imports checked: 0 missing.
- 145 Admin local JS/CSS references checked: 0 missing.
- 22/22 targeted V16.69 behavior assertions passed.
- SQL behavior simulation confirmed:
  - enabled Instagram DM flow => Automation available;
  - disabled Facebook DM flow => Automation hidden/manual available;
  - Facebook comment flow does not lock Facebook DM messaging;
  - enabled WhatsApp DM flow => Automation available;
  - enabled `all` DM flow => Automation available across platforms.
- V16.68 comparison: 0 existing files removed.

## Files added
- `public/admin/final-v16-69-inbox-automation-toggle.js`
- `public/admin/final-v16-69-inbox-automation-toggle.css`
- `FINAL_V16_69_INBOX_AUTOMATION_MEDIA_STORAGE.md`
- `V16_69_RELEASE_VERIFICATION.md`

## Existing files minimally updated
- `functions/_lib/social-automations.js`
- `functions/api/admin/social-dms.js`
- `public/admin/final-v16-56-posts-carousel-dms.js`
- `public/admin/index.html`
- `README.md`
