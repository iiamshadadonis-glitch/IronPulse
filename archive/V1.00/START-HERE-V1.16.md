# DropBeat Dance Studio V1.16 — Start Here

This ZIP is the complete replacement package. It keeps the existing DropBeat theme and established admin, payment, plan, coach, class and integration logic, while adding the requested account-layout, membership, attendance, review and approval improvements.

## Simplest replacement method

Replace the previous project with the entire V1.16 folder. Do not copy individual files into different folders.

If someone manages the Cloudflare project from a computer, use the helper matching that computer:

- Windows: double-click `DEPLOY-V1.16-WINDOWS.bat`
- macOS/Linux: run `DEPLOY-V1.16-MAC-LINUX.sh`

The helper verifies the code first, applies only the pending additive database migration, and then deploys the site. It does not reset or delete existing database records.

## First checks after deployment

1. Open the public site in a private/incognito browser window.
2. Select **Login** and confirm the compact card opens with **Login** selected beside **Student Sign Up** and **Coach Sign Up**.
3. In Coach Sign Up, confirm each teaching session has one Day, one From time, one Until time, one Class Type, multiple optional Dance Styles, and **Add More Sessions**.
4. Sign in as a student and check **Dashboard**, **Sessions**, **Memberships**, **Reviews & Ratings**, **Tickets**, **Notifications** and **Settings**.
5. In the admin panel, open **Webinars → Attendance** and check both Students and Coaches in Calendar and List views.
6. Open **Settings → Approval**, view a student, and confirm session and payment information appears before approval.
7. Open **Settings → Brand Settings → Checkout** to configure the optional active-member discount.

## Important integration notes

- Google Meet attendance is recorded when an eligible student uses **Join Session** or the assigned coach uses **Start Session**.
- The student Join button becomes available five minutes before the class and closes when the scheduled session ends.
- Google Meet requires the existing Google Calendar/Meet integration to be connected.
- Google Login requires the site's Google OAuth Web application and callback URL.
- New managed image uploads use the connected Google Drive/Cloudinary routes from the previous release; image bytes are not added to D1.
- Transactional verification emails require an enabled provider under **Settings → Integrations → Email & OTP**. Google Meet itself does not send email.

## Membership discount

The Membership Discount setting is for a student who already has an active membership and adds another session. The server validates eligibility during both coupon checking and final order creation, so copying the code to a public checkout does not grant the member-only discount.

## Safe rollback note

V1.16 adds attendance and private-review tables without removing earlier tables or records. Keep the previous deployment available in Cloudflare's deployment history as the normal rollback point.
