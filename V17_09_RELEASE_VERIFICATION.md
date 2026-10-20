# V17.09 Release Verification

## Scope

- Removed the standalone **Marketing & SEO** sidebar group and its five admin workspaces: Marketing Home, Google Ads, Social Media Marketing, Email Marketing, and Funnels.
- Preserved **Settings → Integrations**, including its Marketing tab and every advertising, tag, conversion, analytics, and email provider integration.
- Stopped the retired marketing workspace query from running during admin startup.
- Added a safe Dashboard fallback for old calls or bookmarks that target retired workspace IDs.
- Matched Amazon SES, AWS Lambda Email Relay, Mailchimp Transactional, MailerSend / MailerLite, Company Email / GoDaddy, and Amazon S3 Email Assets to the Gmail / Email and WhatsApp card layout.

## Email & OTP visual parity

- Same closed-card height and outer padding reset.
- Same title font family, size, weight, line height, and color.
- Same connection-status alignment.
- Same single circular dropdown arrow position and open-state rotation.
- Existing provider forms, help cards, connection testing, OTP controls, and save/disconnect behavior are unchanged.

## Verification

- V17.09 regression test validates navigation removal, route safety, preservation of Marketing integrations, startup read removal, and card-layout parity.
- Full inherited verification chain runs through V17.08 and all earlier supported suites.
- JavaScript syntax checks and ZIP integrity checks are required before release packaging.
