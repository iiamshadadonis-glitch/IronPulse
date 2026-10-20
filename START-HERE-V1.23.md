# DropBeat Dance Studio V1.23

This is the complete replacement package built from V1.22. It preserves the existing theme and application workflows while adding the requested schedule, calendar, CRM identity, coach leave/remuneration, and marketing integration corrections.

## Deploy

1. Back up the current Cloudflare Pages project and D1 database.
2. On Windows, double-click `DEPLOY-V1.23-WINDOWS.bat`; on macOS/Linux, run `bash DEPLOY-V1.23-MAC-LINUX.sh`.
3. Alternatively, deploy this complete directory to the same Pages project and apply migrations through `0053_dropbeat_schedule_identity_leave_marketing_v1_23.sql`.
4. Clear the browser cache or open the admin in a private window once after deployment.
5. The deployment helper runs `npm run test:dance-v1.23` before applying migrations or publishing.

## Important behavior

- Studio holidays now appear in Online Class, Offline Class, Demo/Webinar and Attendance calendars, and block joining/meeting creation.
- Current/Running and Cancelled schedule tables keep their headers visible when empty.
- Admin Join Session opens five minutes before an active online class and closes at the scheduled end.
- Student account name, email and phone are synchronized to the matching lead by email or normalized phone number. Paid students continue to leave the active-lead list through the existing paid-order rule.
- Leave Rules can be enabled studio-wide, customized per coach, or disabled for an exceptional coach.
- Google Ads, Tag Manager API, Analytics API and Mailchimp are OAuth-capable Marketing Integrations. Tags, pixels and conversion APIs remain under Marketing.
