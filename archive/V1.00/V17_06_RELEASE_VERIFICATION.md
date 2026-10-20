# V17.06 Release Verification

## Lead Email Follow-up reliability

- Keeps **Lead Email Follow-up** visible after Social Media Automations refreshes or remounts its existing workspace.
- Adds a guarded refresh hook and DOM-only safety check; these checks do not query D1.
- Prevents duplicate content-editor overlays and aligns the Actions menu with the toolbar.
- Uses a single-line **Reset Style** control and responsive editor spacing.
- Navigation, Social & Sharing, Sections, Products, Gallery, Blog/RSS and Special blocks now edit every item label and destination URL independently.
- Adds 24 branded content layouts covering welcome, birthday, checkout recovery, renewal, payment failure, subscription failure/cancellation, webinar, course, promotion, feedback and re-engagement use cases.

## Ready-to-activate automation templates

- Replaced generic copied welcome messages with workflow-specific subjects, headings, personalized content, buttons and event/order context.
- Birthday emails include advance messaging and a personalized celebration/confetti block.
- Checkout recovery uses urgency and a final-hours reminder.
- Renewal email displays plan, amount and renewal date.
- Added failed-transaction, failed-subscription and four-stage cancelled-subscription win-back workflows.
- Razorpay, Stripe and PhonePe failure/cancellation webhooks enroll matching active workflows without changing existing payment logic.

## Email & OTP providers

- Preserves Gmail and adds Amazon SES, AWS Lambda HTTPS relay, Mailchimp Transactional, MailerSend, Company/GoDaddy relay and Amazon S3 asset storage cards.
- Supports Save, Test Connection and Disconnect, with masked saved secrets.
- Adds sending and OTP toggles in both cards and the integration summary grid.
- Enforces one primary sender and provides **Use Connected Gmail** to switch back safely.
- S3 is correctly identified as asset/archive storage rather than an email sender.
- Automation, lead-nurturing, payment-recovery, webinar/meeting, admin-notification, invoice and OTP paths use the selected primary provider.
- Attachments are encoded for SES, Lambda/company relays, Mailchimp Transactional and MailerSend.

## Compatibility and verification

- Existing theme colors and existing automation/payment/database behavior are preserved.
- No destructive D1 migration is required; provider settings use the existing settings table and automation tables retain `CREATE TABLE IF NOT EXISTS` guards.
- Admin assets use V17.06 cache-busting URLs.
- `npm run test:v17.06` passes the new regression test plus all inherited tests through V16.88.
- `node --check` passes for every modified admin, Function, provider, automation and webhook JavaScript file.
