# IronPulse Gym V1.04 — start here

This release fixes the repeated text in Social Media → Fitness Tips. No database migration is needed for this UI update. Read docs/FITNESS-TIPS-FIX.md. After deployment, close old Admin tabs and use Ctrl+Shift+R once to load the new script URLs.

Your existing gym database is already selected in this replacement:

- Pages project name: **ironpulse-gym**
- D1 binding: **DB**
- D1 database ID: **893e7d29-fa72-413d-9415-5d93b1c3bc6e**
- Administrator login email: **admin@ironpulse-gym.local**
- Administrator password: **the unique secret you set in Cloudflare**. There is no shared default password.

The screenshot's failure happened after asset upload, when publishing tried to bind a database that was not present in the selected account. That deployment was using older configuration. Retrying that same old commit will keep the old binding.

This release includes every original V1.00 file under archive/V1.00/ alongside the complete working project. Copy the archive folder too: the build verifies the complete source package. Use the root configuration and current instructions. COMPARISON.md explains the file counts.

## 1. Replace the gym repository contents

Use the **gym repository**, separate from your other website.

With GitHub Desktop, choose Repository → Show in Explorer/Finder. Move the old project files to a backup folder outside the repository, keeping the repository's .git folder. Copy **the contents of this extracted project folder** into that repository.

At the repository root, you must see wrangler.jsonc, package.json, public/, functions/ and migrations/. Do not leave these files inside an extra nested ZIP folder. Do not keep another wrangler.toml or wrangler.json from the old project.

Commit the replacement and push it to the branch connected to your gym Pages project. Suggested commit message: **V1.04: Fix Fitness Tips text duplication and page stability**. GITHUB-SUMMARY.txt contains the complete description.

## 2. Set the gym Pages project

Open your gym project in Cloudflare → Workers & Pages. If creating it for the first time, select Pages and connect the gym repository.

| Setting | Value |
| --- | --- |
| Project name | ironpulse-gym |
| Production branch | main, or the branch you just pushed |
| Framework preset | None |
| Root directory | Repository root; leave blank |
| Build command | npm run build |
| Build output directory | public |
| Node version | 24; also pinned in .nvmrc and .node-version |
| D1 binding name | DB |
| D1 database | The existing database with ID 893e7d29-fa72-413d-9415-5d93b1c3bc6e |

The DB binding is declared in wrangler.jsonc. Select the same existing database if the dashboard displays a binding selector. **Do not create another D1 database.** The UUID identifies your database; database_name is its human-readable label. If your D1 dashboard shows a different name, update database_name to that exact name while retaining this UUID and binding DB.

If your Pages project has a different name, update name and vars.SITE_URL in wrangler.jsonc to match that gym project and its actual website URL before pushing.

In Pages → Settings → Variables and Secrets → Production, add **ADMIN_LOGIN_PASSWORD** as an encrypted secret. Choose your own unique password. Keep ADMIN_DEVELOPMENT_BYPASS set to false. Repeat the secret in Preview only if you intend to use preview deployments.

## 3. Deploy the new commit

Deploy the latest pushed commit. In its build log, confirm these exact lines:

    IronPulse Gym V1.04 (package 1.4.0)
    D1 binding DB: 893e7d29-fa72-413d-9415-5d93b1c3bc6e

The npm run build step uses the pinned project Wrangler and should compile the Worker successfully. Use the printed release, UUID and commit to identify the source being deployed. If it still shows an older project, old login email or different D1 ID, check the connected repository, branch, commit and root directory.

If the new UUID is reported as not found, the Pages project and this D1 database must be placed in the **same Cloudflare account**. A database ID cannot grant access to another account's database.

A fresh database is prepared by the existing application schema initialization. This was tested with an empty local Cloudflare D1. You do not need to paste SQL or rename tables for the normal Pages deployment.

After Cloudflare marks the deployment successful, open its website → /login → Admin and use admin@ironpulse-gym.local with the password secret you set. This local-domain address is a login identifier; configure your real contact and sending email in Admin.

## 4. Finish gym integrations

In Admin, set the actual gym name/contact details, real photos, payment credentials and Google integrations. Keep credentials out of Git.

- Razorpay: use the gym account credentials and set its webhook to your deployed gym origin followed by **/api/webhooks/razorpay**. Use the same webhook secret in Razorpay and this gym's settings.
- Google member sign-in: register your deployed origin and the exact **/api/portal/google/callback** redirect URL in the gym Google OAuth client.
- Other Google integrations: copy the callback URL shown in the corresponding Admin integration card. Their existing callback paths are retained.
- Use your actual gym domain in SITE_URL after attaching a custom domain. Update the provider webhook/OAuth URLs to that domain at the same time.

Real payment, webhook and Google account checks require your own provider credentials; local verification uses synthetic data and does not contact those providers.

## Optional computer-assisted deployment

Requires Node 24 and access to the Cloudflare account that owns the database:

    npm ci
    npm run setup:gym
    npm run deploy

Setup verifies this existing UUID, resolves its actual database name, and stores your chosen administrator password as a Pages secret. It never creates another database or project. Create/connect the gym Pages project first.

For an account/binding check only:

    npx wrangler login
    npm run check:cloudflare

For a Git-connected project, commit and push any configuration updates made by setup/check. The Pages deployment uses the committed configuration.

Open CLOUDFLARE-FIX.md for the screenshot-specific fix, PACKAGE-CONTENTS.txt for all included files, and RELEASE-VERIFICATION-GYM.md for the exact local test results. After a successful deployment, /release.json identifies this package as V1.04.
