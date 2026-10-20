# DropBeat Dance Studio V1.18 — Start Here

This is the complete replacement package. It preserves the existing website logic, student dashboard and colour themes. V1.18 changes only the admin-side notification badge maintenance that could keep retriggering itself after login and prevent the Admin Dashboard from responding to clicks.

## Simplest replacement method

Replace the previous project with the entire V1.18 folder. Do not paste individual files into unrelated folders.

If someone manages the Cloudflare project from a computer, use the helper matching that computer:

- Windows: double-click DEPLOY-V1.18-WINDOWS.bat
- macOS/Linux: run DEPLOY-V1.18-MAC-LINUX.sh

The helper installs the deployment tool, runs the complete inherited verification suite, safely applies any pending additive migrations, and deploys the verified site. It does not reset or delete existing data.

## What was fixed

- The Business Ops notification observer now pauses while it performs its own badge cleanup, then resumes on the next animation frame.
- Empty or hidden notification badges are changed only when their value or visibility really needs to change.
- The same idempotent update rule is applied to the existing admin navigation and Inbox badges to prevent related observer churn.
- Admin Dashboard buttons, sidebar groups, panel options and Logout remain available to the browser event loop after login.

No student-dashboard file, colour-theme file, business workflow, payment workflow, database schema or API behavior was changed in V1.18.

## First checks after deployment

1. Open the website in a private/incognito window and sign in as admin.
2. Confirm Dashboard can be clicked immediately.
3. Open each sidebar group: Business Ops, Analytics, Webinars, Social Media and Settings.
4. Click several options, return to Dashboard, and confirm Logout is clickable.
5. Refresh the Admin Dashboard and repeat the checks.
6. Sign in as a student and confirm the existing Student Dashboard still behaves as before.

## Safe rollback note

V1.18 does not remove tables or records. Keep the previous Cloudflare deployment in deployment history as the normal rollback point.
