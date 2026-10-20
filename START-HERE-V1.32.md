# DropBeat Dance Studio V1.32

This complete replacement is built directly from the supplied V1.31 package. V1.32 finishes dark-mode coverage for dashboard result dialogs and Client Details, fixes the Add Coach dance-style selector in dark mode, and adds a phone/tablet app presentation for the public site, Admin, Student Dashboard and Coach Dashboard. Light-mode colours, desktop layout and business logic are unchanged.

## Safe deployment

1. Back up the current Cloudflare Pages project and D1 database.
2. Replace the project files with this complete V1.32 package. Do not delete or recreate D1.
3. Run `DEPLOY-V1.32-WINDOWS.bat` on Windows or `bash DEPLOY-V1.32-MAC-LINUX.sh` on macOS/Linux.
4. The helper installs dependencies, runs V1.32 and every inherited regression test, applies the existing additive migrations, and deploys only after tests pass.

## Verify after deployment

- In Admin dark mode, open every Subscriptions Overview dialog, Visitors, Repeat Visitors, Student Sign-ups, Coach Sign-ups, Paid Customers and Top Sources.
- Open any Client Details record and review Summary, Profile, History, Payments, Refunds and Invoice. Surfaces, tabs, tables and semantic badges should all be dark and readable.
- Open Add Coach from Webinars and from Pages. Expand Dance Styles for This Session and confirm every choice is visible.
- On a phone, confirm Admin opens directly to its content with a fixed menu button; the sidebar should open as a drawer rather than occupying the whole page.
- On a phone, confirm plan cards appear as a compact two-column catalog, the footer is compact, and Student/Coach dashboards use app-style bars, cards and bottom-sheet dialogs.
- Return to light mode and desktop width and confirm their existing appearance is unchanged.

No new D1 migration is included in V1.32.
