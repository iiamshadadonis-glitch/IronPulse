# DropBeat V1.08 — non-coder replacement guide

You do not need to paste or run `npm`, `npx`, `wrangler`, migration, or deployment commands in the website or admin panel.

## Replace the website

1. Download and unzip the complete V1.08 replacement package.
2. In the GitHub repository connected to the existing Cloudflare Pages project, replace the old project with **all** files and folders from the unzipped V1.08 folder.
3. Keep the folder names exactly as provided. In particular, upload `functions`, `migrations`, `public`, `tests`, `package.json`, `package-lock.json`, and `wrangler.jsonc` together. Do not upload only `public`.
4. Commit the replacement to the same branch already used by Cloudflare Pages. Cloudflare will start the deployment automatically.
5. Wait until that deployment reports **Success**, then open the website in a private/incognito window.

## First check after deployment

1. Sign in at `/admin/`.
2. Open **Business Ops → Sales → Plans & Offers** once.
3. Open **Webinars → Online Classes → Members** once.
4. Return to **Sales → Plans & Offers** and open **Add New Plan / Offer** or edit an existing plan.

Those page requests safely create only the missing V1.08 database additions. Existing plans, customers, orders, payments, integrations, and website content are retained. There is no separate migration command for the website owner.

## What to confirm

- The section is called **Class or Event Details** and uses an **Enable class details** switch.
- The public batch date can be blank, permanently visible, or automatically hidden after the selected launch date.
- Selecting the configured number of class days disables the remaining day buttons.
- Recurring reminders use an on/off switch.
- **Create Subscription** contains optional class/event details.
- **Create One-Time Payment** requires class-access start and end dates.
- Coach cards can be reordered, enabled, disabled, or removed. A replacement is required when a coach still has active classes or students.
- Online, offline, demo, and webinar member lists show the coach in a separate column.
- Track Order shows the remaining one-time class access and a last-day/expired notice.

## If an older screen is still open

V1.08 uses new asset filenames and cache keys. Close the old tab, open a new private/incognito window, and visit the site again. No browser-console command is required.

