# DropBeat Dance Studio V1.31

This complete replacement is built directly from the supplied V1.30 package. V1.31 completes the remaining dark-mode surfaces reported in Admin, the public website, Student Dashboard and Coach Dashboard. It also removes the duplicate appearance card from Brand Settings → Profile and improves session-row spacing. Existing light-mode colours and business logic are unchanged.

## Safe deployment

1. Back up the current Cloudflare Pages project and D1 database.
2. Replace the project files with this complete V1.31 package. Do not delete or recreate D1.
3. Run `DEPLOY-V1.31-WINDOWS.bat` on Windows or `bash DEPLOY-V1.31-MAC-LINUX.sh` on macOS/Linux.
4. The helper installs dependencies, runs V1.31 and every inherited regression test, applies the existing additive migrations, and deploys only after tests pass.

## Verify after deployment

- Switch Admin to dark mode and inspect Pages, Approvals, the Subscriptions Overview message, Webinars coach cards and empty calendar/list states.
- Open Add Coach and Add Member; confirm Teaching Availability, Approved Remuneration, helper text and reminder controls are readable.
- Open Integrations → Email & OTP and other integrations; confirm provider cards, forms and every toggle use dark surfaces.
- In Brand Settings → Profile, confirm Website Colors/Theme is absent. Open the separate Website Colors tab and confirm both appearance sub-tabs remain available.
- On FAQ, Privacy Policy, Terms & Conditions and Refund & Cancellation, confirm the main headings are visible.
- On the home page, confirm dark mode does not place an extra dark shade over the uploaded banner image.
- In Student and Coach dashboards, confirm status banners and session states are readable, and dates stay on one line with time on the next line.
- Return to light mode and confirm its existing colours are unchanged.

No new D1 migration is included in V1.31.
