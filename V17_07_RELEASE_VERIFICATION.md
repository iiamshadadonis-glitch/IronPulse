# V17.07 Release Verification

## Scope

This release is an additive update to the V17.06 replacement package. Existing website themes, current automatic branded emails, visitor read protections, order logic and integrations remain in place.

## Webinar invitation automation

- The webinar schedule now supplies the automation with the exact webinar database ID, start time and calculated end time.
- The ready-made webinar flow sends the invitation and scheduled reminder, waits until three hours after the event, then checks the saved `webinar_members.last_attendance_at` value for that exact event.
- Attended members receive the feedback email and complete the workflow.
- Missed members receive a nurturing re-registration email linked to Contact, wait three days, then branch on a saved Contact-form submission made after that email.
- A recorded response completes the workflow; no response sends the final urgent re-registration reminder and then completes it.
- The Condition inspector now exposes readable Webinar Attendance, Contact Form Response and Previous Email Opened fields with separate yes/no actions and validated later-step destinations.

## Email editor UI

- Actions and Edit Content menus use one controlled popover instead of native disclosure controls with duplicate arrows.
- Email block move, duplicate and delete controls use permanent high-contrast themed buttons.
- Existing per-item label and destination URL editing remains available for Navigation, Social, Gallery and other collection blocks.

## Email & OTP integrations

- Removed the duplicate Additional Email & OTP Integrations grid.
- Removed the standalone Primary Sender toolbar.
- Amazon SES, AWS Lambda relay, Mailchimp Transactional, MailerSend, Company Email / GoDaddy and Amazon S3 now appear in the existing Connected Email & OTP grid.
- Provider cards use the same compact card, field, typography, padding and single themed disclosure arrow as the existing integration area.
- Each provider includes a circular information control with a back view containing setup steps, examples, control behavior and official documentation links.
- Connected and enabled Gmail remains the first-choice email/OTP provider. When Gmail is disabled or unavailable, the selected enabled fallback provider is used.
- Non-Gmail OTP capability is reflected in the public OTP availability endpoint and the request/verification paths.

## Cache busting

- Modified admin styles and scripts use the V17.07 cache query.

## Verification performed

- `node --check` passed for every modified JavaScript backend and admin file.
- `node tests/v17-07-webinar-email-ui.mjs` passed, including live template-graph branch assertions.
- `npm run test:v17.07` passed the complete inherited regression chain from V17.07 through V16.88.
