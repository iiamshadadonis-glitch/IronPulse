# Urgent Casting add-on fixes

This replacement keeps the no-R2 Cloudflare Pages + D1 setup and adds the requested fixes:

- Local admin login at `/admin/` using email/password.
- Default first login: `admin@urgent-casting.com` / `ChangeMe@123`.
- Change the password from Admin Security after logging in.
- Separate admin pages for Social Media Profiles, Tracking Info, Payment Integration and API Settings.
- API Settings shows complete API Base URL, Vendor User ID, Bearer token, automation endpoints and webhook endpoints.
- Payment Integration shows Razorpay, Stripe and WhatsApp webhook URLs and accepts gateway credentials.
- Contact form submissions land in Admin → Contact Leads and can also notify WhatsApp when messaging credentials are configured.
- Footer now stays at the bottom of short pages.
- Floating WhatsApp button moves above the footer and should not collide with footer text.
- Website designed by Instautomate is clickable and opens https://instautomate.com.
- Public navigation now includes Home and Login.
- Daily Audition Updates page no longer mentions automation software or admin/API text publicly.

Important: do not use Cloudflare R2 for this version. Uploaded media is stored through D1-backed `/api/media/...` URLs.
