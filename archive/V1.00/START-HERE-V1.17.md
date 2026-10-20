# DropBeat Dance Studio V1.17 — Start Here

This is the complete replacement package. It keeps the existing DropBeat theme and established website, admin, plans, payments, classes, coaches, attendance, approvals and integration logic. V1.17 adds the requested student checkout and payment-statement improvements and removes the admin navigation freeze.

## Simplest replacement method

Replace the previous project with the entire V1.17 folder. Do not paste individual files into unrelated folders.

If someone manages the Cloudflare project from a computer, use the helper matching that computer:

- Windows: double-click `DEPLOY-V1.17-WINDOWS.bat`
- macOS/Linux: run `DEPLOY-V1.17-MAC-LINUX.sh`

The helper installs the deployment tool, verifies the complete inherited test suite, safely applies any pending additive migrations, and deploys the verified site. It does not reset or delete existing data.

## What changed

- Student dashboard colours now include **Reset Colours**, which restores the current Brand Settings colours rather than fixed hard-coded colours.
- A signed-in student who selects **Book Now** receives a checkout with Name, WhatsApp Number and Email already filled. City remains optional.
- The old Preferred Dance Style/Profile checkout question was removed.
- **Choose Your First Class** disappears after a successful/active payment or current class assignment. Students can use **Add More Sessions** or **Memberships → Plans & Offers** afterward.
- Member discounts still appear only for eligible existing members and remain server-validated.
- **Download Payment Statement** now opens a date-period window, displays only the signed-in student's stored verified payment records, and downloads a branded PDF instead of CSV.
- Statement branding follows the current Brand Settings name, tagline, logo, primary colour and accent colour.
- Empty statements are supported and explain that no payment activity exists in the selected period.
- The admin sidebar no longer enters an add/remove observer loop. All admin menu groups and Logout remain responsive after login and refresh.

## First checks after deployment

1. Open the public site in a private/incognito window and sign in as a student.
2. Open **Settings → Dashboard Colours**, save a temporary colour, then select **Reset Colours**.
3. From **Memberships → Plans & Offers**, select **Book Now** and confirm Name, WhatsApp Number and Email are filled automatically.
4. Confirm checkout contains only Name, WhatsApp Number, Email and optional City.
5. Open **Memberships → Current Membership → Download Payment Statement**, select a period, refresh the records, and download the PDF.
6. Sign in as admin and confirm Dashboard, Business Ops, Analytics, Webinars, Social Media, Settings and Logout are clickable without the browser becoming unresponsive.

## Payment statement source

The statement reads the website's verified payment receipts and order status records written by the configured Razorpay, PhonePe, Stripe or manual-payment workflow. It is securely filtered to the signed-in student's email/account. It does not expose another student's transactions. No new payment provider credential is required for the statement itself.

## Safe rollback note

V1.17 does not remove tables or records. Keep the previous Cloudflare deployment in deployment history as the normal rollback point.
