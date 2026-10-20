# DropBeat Dance Studio V1.39 — complete replacement

Replace the V1.38 project with this complete folder. Keep your existing Cloudflare secrets, environment variables and D1 binding.

## Deploy
Windows: run `DEPLOY-V1.39-WINDOWS.bat`.
macOS/Linux: run `bash DEPLOY-V1.39-MAC-LINUX.sh`.

The scripts install dependencies, run the current regression suite and deploy using the existing project configuration. No database migration is needed for these presentation changes. Refresh once after the deployment succeeds.

## Mobile corrections
- Smaller, consistent action icons; readable navigation labels; compact input and helper text.
- Title and related search/help/refresh/download actions share one row, with actions on the right. The main Dashboard keeps the requested Refresh text button beside Create Subscription.
- Order record headers omit duplicate notification badges; navigation badges remain.
- Selection sheets use thin circles and selected ticks, support the original single/multiple selection rules, and can close using X, Done, the backdrop or a downward swipe on the handle/header.
- Refund search and Open Refund actions share a row; form close controls are compact.
- Contacts and attendance cards stay within their containers, wrap long emails, separate names/payment notes and align value columns.
- Add/Edit Coach has Coach Details, Schedule & Availability, Approved Remuneration and Options & Save. Availability and remuneration are whole sections with one owning step. Generic form steps no longer repeat the same category because of field-count splitting.
- Growth metrics use the same two-card viewport and maximum two balanced rows as the dashboard.
- Line, vertical and horizontal charts allow normal native finger scrolling in either direction. Hold to inspect a data point; normal swipes scroll. New chart views begin at the start. Donuts are smaller circles and period controls are compact.
- Heat Map/Scroll Map/Attention Map controls use two columns with a full-width Page Path; previews fill their width and Top Engagement Elements opens a sheet.
- Attendance filters use two columns; calendar data and attendance calculations are unchanged.

New assets use V1.39 filenames/build URLs. Dashboard HTML remains no-store. An already open tab needs one reload to stop executing the previous version.

Desktop rendering, saved theme colors, authentication, financial calculations, gateway handlers and database files are unchanged. Browser tests use synthetic data, not live payments.

See `DANCE-STUDIO-V1.39-VERIFICATION.md` for test details.
