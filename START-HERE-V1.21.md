# DropBeat Dance Studio V1.21 — Start Here

This is the complete replacement package for the holiday, image, coach-profile, active-domain and Gmail corrections. It includes the V1.20 Schedule and Attendance fixes and preserves the existing student-dashboard behavior, business logic, records and colour theme.

## Simplest replacement method

Replace the previous project with the entire V1.21 folder. Do not copy only `public` or only one JavaScript file.

- Windows: double-click `DEPLOY-V1.21-WINDOWS.bat`
- macOS/Linux: run `bash DEPLOY-V1.21-MAC-LINUX.sh`

The helper installs the deployment tool, runs the complete inherited verification suite, confirms the existing additive migrations, and deploys the verified site. It does not delete or reset existing records.

## What V1.21 corrects

- Upcoming Holidays shows only the clickable event name; the subject is no longer crowded into the table.
- Holiday previews, dashboard notices and emails preserve the paragraphs and blank lines entered by the admin.
- The Event End Date remains hidden until **+ Add an end date** is selected.
- Existing and newly uploaded public Google Drive images use an inline image URL in holiday previews, student/coach profiles, approvals and dashboards instead of an attachment URL that appears broken in an `<img>` element.
- Add/Edit Coach asks for contact details, profile image, designation, badge, biography, experience, social links and structured Teaching Availability sessions. Admin creation intentionally does not ask for a password.
- Coach sign-up uses the compact **+ Sessions** label.
- Website, document-logo, Search Console and sitemap links follow the hostname currently serving the website. The standard sitemap address is `/sitemap.xml`.
- Gmail displays only the account returned by Google OAuth. A connection is considered active only after the selected identity and Gmail send permission are verified.
- Gmail testing no longer calls the profile endpoint that rejects the narrow `gmail.send` scope with an insufficient-authentication-scopes 403.

## Required one-time Gmail reconnection

For safety, any older Gmail record that did not store a verified Google identity and verified send scope is shown as disconnected.

1. Open **Admin → Integrations → Gmail**.
2. Confirm the OAuth Client ID and Client Secret, then save.
3. Select **Connect Gmail**, choose the exact Gmail account you own, and approve the requested Gmail send permission.
4. Select **Test Connection**.
5. Enable Gmail/OTP only after the card shows the correct Google account and verified send scope.

If `support@yourdomain.com` is a verified Gmail **Send mail as** alias, it can remain the sender address. The connected Google account is still displayed separately and truthfully.

## First checks after deployment

1. Open Admin in a private window and confirm **Webinars → Schedule** remains visible.
2. Open Holidays, add a single-day holiday, and confirm Event End Date stays hidden until requested.
3. Enter a multi-paragraph holiday message and confirm the preview keeps the same line breaks.
4. View an existing student profile image and a holiday image; re-uploading should not be necessary for public Drive files.
5. Open Add Coach and confirm the Teaching Availability rows and **+ Sessions** control are present.
6. Open Integrations and confirm Search Console shows the current hostname plus `/sitemap.xml`.
7. Reconnect Gmail once using the steps above and confirm the exact selected account appears.

## Data safety

V1.21 contains no destructive migration. All 51 existing additive migrations remain unchanged and are safe to confirm through the normal deployment command.
