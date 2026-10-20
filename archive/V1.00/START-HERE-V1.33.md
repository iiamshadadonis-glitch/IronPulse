# DropBeat Dance Studio V1.33

V1.33 is the complete replacement package for the supplied V1.32 code.

## What was corrected

- Added a brand-new V1.33 Admin stylesheet and runtime filename, plus a unique build key. The browser cannot reuse the V1.32 files for this release.
- Added a brand-new V1.33 public/mobile stylesheet filename and unique build key to all 26 static pages, dynamic Dance Tips pages, dynamic custom pages, and the HTML middleware fallback.
- Prevented Cloudflare/browser document caching from hiding a newly deployed asset list. HTML responses now use `no-store`, CDN `no-store`, and an `X-DropBeat-Release: 1.33.0` response marker.
- Corrected the Cloudflare Pages deployment target from `dance-class` to `dance-class-at2`, matching `https://dance-class-at2.pages.dev` in the supplied configuration.
- Added final dark-mode coverage for the dashboard subscription dialogs, visitor/repeat-visitor lists, Student and Coach Sign-ups, Paid Customers, Top Sources, Client Details tabs, tables, refunds, invoices, profile media, status badges, and Add/Edit Coach teaching-availability style picker.
- Reinforced the phone Admin off-canvas drawer, two-column plan catalog, compact footer, Student/Coach portal cards and session rows, and phone bottom-sheet dialogs.
- Preserved the supplied login, subscription, payment, D1 schema, Admin data, and portal business logic byte-for-byte.

## Deploy on Windows

1. Extract the entire ZIP into a new folder.
2. Double-click `DEPLOY-V1.33-WINDOWS.bat`.
3. Wait for all four steps to complete.
4. Open your normal website URL and refresh once. No manual browser cache clearing is required because V1.33 uses new asset filenames.

## Deploy on macOS or Linux

From the extracted folder, run:

```bash
chmod +x DEPLOY-V1.33-MAC-LINUX.sh
./DEPLOY-V1.33-MAC-LINUX.sh
```

## Quick release check

- On desktop, open Admin, switch to dark mode, and open a subscription card, Visitors, Student Sign-ups, Coach Sign-ups, Paid Customers, Top Sources, Client Details, and Add Coach.
- On a phone, open Admin: the sidebar must be closed behind the top menu button instead of appearing as the desktop sidebar.
- On a phone, open Pricing/Offers: plan cards must appear in a compact two-column catalog.
- On a phone, open Student and Coach dashboards: cards and session rows must use the compact portal layout.

The page response header `X-DropBeat-Release: 1.33.0` and the Admin HTML marker `dropbeat-release=1.33.0` identify the deployed release.
