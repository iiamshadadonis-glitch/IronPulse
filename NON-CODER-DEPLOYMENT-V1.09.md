# DropBeat V1.09 — non-coder replacement guide

You do not need to paste or run `npm`, `npx`, `wrangler`, migration, or deployment commands in the website or admin panel.

## Replace the website

1. Download and unzip the complete V1.09 replacement package.
2. Open the GitHub repository already connected to the existing DropBeat Cloudflare Pages project.
3. Replace the old project with **all** files and folders from the unzipped V1.09 folder.
4. Keep the folder names exactly as supplied. Upload `functions`, `migrations`, `public`, `tests`, `package.json`, `package-lock.json`, and `wrangler.jsonc` together. Do not upload only `public`.
5. Commit the replacement to the same branch Cloudflare Pages already deploys.
6. Wait until the Cloudflare Pages deployment reports **Success**, then open the site in a private/incognito window.

## First check after deployment

1. Sign in at `/admin/`.
2. Open **Settings → Pages → Coaches & Founding Team**.
3. Edit each coach and choose their Available Days and **Class Types They Conduct**, then save.
4. Open **Business Ops → Sales → Plans & Offers** and edit a plan with Class or Event Details enabled.
5. Select a coach and confirm that Class Type and Class Days immediately change to that coach's supported choices.
6. Check the same behaviour in **Create Subscription** and **Create One-Time Payment**.
7. Open the public About page and test **See more**, **See less**, and the coach navigation arrows.

The first relevant admin request safely adds only the missing V1.09 database column. Existing coaches default to all five class types so currently published plans are not broken. Saving a coach lets you narrow those choices deliberately. Existing plans, orders, customers, payments, content, and integrations are retained.

## What to confirm

- Public cards show a two-line biography and two specialty tags before expansion.
- No more than three coach cards appear at a time on desktop.
- Previous/next arrows move through additional coaches.
- Add/Edit Coach includes Available Days and Class Types They Conduct.
- Selecting a coach hides every unavailable weekday and unsupported class type in all three Sales workflows.
- A conflicting assignment shows a clear validation message instead of silently saving an impossible schedule.
- Online, Offline, and Demo / Webinar workspaces list only appropriate coaches.
- Saving, ordering, enabling, and disabling coaches no longer waits on redundant refreshes or public-cache purges.

## If an older screen is still open

V1.09 uses new filenames and cache keys. Close the old tab, open a new private/incognito window, and visit the site again. No browser-console command is required.
