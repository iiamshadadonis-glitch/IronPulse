# V16.93 Release Verification

> Historical V16.93 checklist only. V16.94 supersedes this procedure and does **not** require a manual D1 migration command. Follow `V16_94_RELEASE_VERIFICATION.md` for the current replacement.

1. Apply `migrations/0040_v16_93_marketing_integrations_email.sql` through the normal D1 migration command.
2. Open Settings → Integrations → Marketing and confirm every provider is a separate full-width dropdown with its own Help & Instructions flip view.
3. Save and test one provider. Confirm the status table changes from Disconnected to Configured or Connected only after real credentials/test success.
4. Open Webinars and verify Google Calendar/Meet, Zoom and External Provider have separate cards and actions.
5. Open Marketing → Email Marketing, save a draft, and confirm it remains unsent. Use Send only with a test Mailchimp audience.
6. Open Analytics → Heat Maps. Confirm Desktop/All Devices shows a desktop-width page, Tablet shows tablet width, and Mobile shows mobile width. Search/select a page without typing a leading slash.
7. Grant Analytics consent on a public page, click/scroll, wait up to one minute, and press Apply. Confirm heat dots/bands and Top Engagement Elements appear.
8. Open Marketing Analytics and hover anywhere along a line segment. Confirm the tooltip appears without needing to hit the point marker.

Automated verification: `npm run test:v16.93`.
