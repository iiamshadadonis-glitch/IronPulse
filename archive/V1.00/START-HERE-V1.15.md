# DropBeat Dance Studio V1.15 — Start Here

This is a complete replacement package. It preserves the existing public theme, admin dashboard, plans, orders, payments, class mappings, coaches and integrations, then adds the requested account, dashboard, storage and support-ticket changes.

## Easiest deployment

Use the same complete-replacement upload process that you used for the previous package. Replace the previous package with the full V1.15 folder; do not paste individual files into different places.

If a developer manages the Cloudflare project from a computer, the package also includes:

- `DEPLOY-V1.15-MAC-LINUX.sh`
- `DEPLOY-V1.15-WINDOWS.bat`

Those helpers test the replacement, apply the pending D1 migration and deploy in the correct order. They may open Cloudflare's normal login/authorization prompt. They do not delete the database or existing records.

## First checks after deployment

1. Open the public site in a private/incognito window.
2. Confirm the menu says **Login** and no longer shows Track Order.
3. Open Login and confirm **Login** is selected, beside **Student Sign Up** and **Coach Sign Up**.
4. Refresh the admin Pages screen, open **Coaches & Founding Team**, and confirm **Coach Account Status** stays collapsed until clicked.
5. Open **Business Ops → Orders & Leads → Tickets**.
6. Create one test student and one test coach account, then confirm each opens the correct dashboard/status page.

## Connect Google Drive before uploading new images

Open:

**Settings → Integrations → Storage → Google Drive API**

Connect the studio's Google account, choose the destination root folder and run the available connection test. Profile photos, banners, studio-gallery images, page images and brand images use this connection. Product website crops use Cloudinary. The V1.15 upload paths do not place new image bytes in Cloudflare D1.

If Drive is not connected, sign-up still works when the optional profile photo is left empty. The user sees a safe message and a Contact Us link rather than Google credentials or coding details.

## Google Login setup

In the Google Cloud OAuth Web application used by the site, keep the existing Calendar/Meet callback and add:

`https://YOUR-WEBSITE-DOMAIN/api/portal/google/callback`

For the Pages address used in the supplied screenshots:

`https://dance-class-at2.pages.dev/api/portal/google/callback`

Save the OAuth Client ID and Client Secret in the site's Google integration. Then open **Settings → Brand Settings → Login** and connect the administrator's Google account. Public visitors never see the OAuth secret or redirect setup instructions.

## Why an admin email confirmation may not arrive

Google Meet is not an email sender. Admin email-change verification codes are sent only through an enabled transactional provider under:

**Settings → Integrations → Email & OTP**

Connect and test Gmail or another supported provider, then enable OTP sending. The system will not claim a code was sent when no email provider accepted it.

## Account and payment behavior

- Existing admin credentials continue opening the existing admin dashboard.
- A student signing up with an email that has a verified/current payment is activated automatically.
- Other student accounts show Pending Approval until approved.
- Every coach application remains private until approved.
- Only approved/current coaches appear publicly.
- A successful payment links to an existing student account when the verified email or phone matches.
- A new paid customer is signed into a newly created Student Dashboard and must set a password before continuing.
- Old `/my-orders` links redirect to the Student Dashboard activity view.
- Tickets are available only to verified paid students and approved active coaches; general visitors use Contact Us.

## Google Meet access

- A coach can start only an assigned online session.
- A paid active student can join only an assigned session, starting five minutes before class and ending when the class finishes.
- Cancelled, holiday and leave sessions disable joining and show a class-specific notification.
- Meeting URLs are not exposed in the dashboard data before the secured handoff.

