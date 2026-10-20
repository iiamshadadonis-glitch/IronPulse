# Urgent Casting Replacement Build - Admin, Banner, Audition Update, Dashboard and Success Story Fixes

This build keeps the existing Cloudflare Pages + D1 + no-R2 setup and adds the requested admin/dashboard improvements.

## Default first login

Use this only for the first login, then change the password from Admin Security.

- Email: `admin@urgent-casting.com`
- Password: `ChangeMe@123`

The default login details are intentionally not shown on the public/admin login screen.

## Important additions

- Hero banners are now full homepage hero slides, not only a small right-side image.
- Existing banners can be edited.
- Banner header/text fields include character counters.
- Social media settings use green/grey toggle switches.
- Enabled social profiles without a pasted URL use the platform homepage for testing.
- Audition Updates are separated from API Settings and no longer require automation token inside admin.
- Audition Updates support plain writing, tags, edit, delete and published/draft status.
- API Settings are separated and include base URL, bearer token, vendor ID, endpoints and webhooks.
- Payment Integration includes Razorpay/Stripe/WhatsApp webhook URLs.
- Admin Security includes password change, email change request/confirm and connected Google email field.
- Dashboard includes leads, hot leads, active subscribers, follow-ups, pending collections and payment overview.
- Create Subscription page generates a custom subscription/order link.
- Orders include pause/resume/cancel/update/complete action buttons.
- Contact leads are connected to the public contact form.
- Success Stories admin section added for YouTube/Instagram links.
- Public success story slider and Success Stories page added.
- Footer is consistent on all pages with 2026 rights text and clickable Instautomate link.
- R2 is not required. Media upload remains D1-backed through `/api/media/...`.

## Google login note

Email/password login works immediately.

Google login requires Cloudflare Access protection for `/admin/*`. After connecting a Gmail address in Admin Security, configure Cloudflare Access using the same Gmail address.

## Audition Updateger note

Direct publishing to Audition Updateger requires Google OAuth/Audition Updateger permissions. The project stores Audition Updateger Audition Update ID/API Key details in API Settings, and the recommended workflow is:

1. automation software publishes to Audition Updateger using Google OAuth.
2. automation software also sends the same title/content/tags to this website using `POST /api/automation/audition updates`.

This keeps your audition update content backed by Audition Updateger while still showing the same audition update list on the Urgent Casting website.
