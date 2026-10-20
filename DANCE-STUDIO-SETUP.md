# DropBeat Dance Studio V1.09 – Cloudflare setup

This is a Cloudflare **Pages + Pages Functions** project. It is not a standalone Worker and it is not WordPress. The DropBeat theme supplies the visual presentation; the tested V17.09 application supplies the admin, APIs, D1, memberships, payments, CRM and integrations.

## Why the earlier build failed

The failed Cloudflare application ran `npx wrangler deploy`. That command deploys a standalone Worker and requires a Worker entry point. This repository instead contains a static site in `public/` and server routes in `functions/`, so it must be deployed with Cloudflare Pages.

The V1.00 package also contained a deliberate D1 placeholder. V1.09 retains the database configuration corrected in V1.01:

- D1 database name: `dance-class`
- D1 database UUID: `16c9361a-625c-4c71-8ecb-6608a8836152`
- D1 binding used by the application: `DB`
- Pages project name: `dance-class`

The UUID is Cloudflare's permanent identifier for this D1 database. It is expected and is now connected in `wrangler.jsonc`.

## Correct deployment procedure

If you are not a coder, use `NON-CODER-DEPLOYMENT-V1.09.md`. You do not need to run any command shown later in this document.

1. Upload or commit the complete V1.09 replacement to the root of the connected GitHub repository. Replace the old files and folders together; do not upload only `public/`.
2. In Cloudflare, remove only the failed `dance-class` application if it was created as a **Worker**. Do not delete the D1 database.
3. Choose **Workers & Pages → Create application → Pages → Connect to Git**.
4. Select the `Dance-Class` repository and the `main` branch.
5. Use these settings:
   - Framework preset: `None`
   - Build command: leave blank
   - Build output directory: `public`
   - Root directory: `/`
6. If Cloudflare shows a Deploy command field, use exactly `npm run deploy` — never `npx wrangler deploy`.
7. Confirm the Pages project name is `dance-class`.
8. In the Pages project, open **Settings → Bindings** and confirm a D1 binding named exactly `DB` points to the `dance-class` database. The repository configuration normally creates this binding; add it manually only if Cloudflare does not show it.
9. Deploy. The site address will be `https://dance-class.pages.dev` unless Cloudflare adds a suffix because that name is already taken.
10. Open `/admin/` and sign in with the temporary credentials below. Change both the email and password immediately in Admin Settings.

## Temporary first login

- Email: `admin@dance-class.local`
- Password: `DropBeat@2026!FirstLogin`

The first successful login creates the initial local admin record in D1. After changing the password, the old temporary password no longer works.

## D1 initialization — no terminal required for the website owner

V1.09 includes safe, additive schema initialization inside the relevant APIs. After the full replacement is deployed, sign in and open **Pages → Coaches & Founding Team**, then **Sales → Plans & Offers** once. Those requests create only the missing V1.09 coach class-type column and any older missing dance-studio additions in the already-bound D1 database. Existing plans, orders, customers and integrations are preserved.

Migration `0045_dropbeat_class_access_coach_continuity.sql` is also included for developers and clean installations. You do **not** need to paste `npm run d1:migrate:remote`, `npm run deploy`, or any other command into the admin panel. Do not run `d1:create`; the existing database remains authoritative.

## Developer-only verification commands

Website owners can ignore this section. These commands are included for a developer or deployment engineer and are not pasted into the admin panel.

```bash
npm install
npm run test:dance-v1.09
npm run d1:migrate:local
npm run d1:migrate:remote
npm run deploy
```

The deployment command is deliberately a Pages command:

```bash
wrangler pages deploy public --project-name dance-class --branch main
```

## Before accepting payments

Add the required payment, email, WhatsApp and social secrets inside the new Cloudflare Pages project. Do not copy a production secret from another project unless the same business account is intentionally shared. Update `SITE_URL` after connecting a custom domain.
