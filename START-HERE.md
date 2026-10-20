# Set up IronPulse Gym

Use a **new repository, new Pages project and new D1 database**. Keep the dance deployment as it is.

## A. Easiest Windows setup

1. Install Node.js 24 and extract the ZIP completely.
2. Open the extracted `IronPulse-Gym-V1.00` folder.
3. Double-click **SETUP-GYM-WINDOWS.bat**. It installs the tools and opens Cloudflare login. Sign in to your Cloudflare account.
4. Enter a new Pages project name, a new D1 database name and your administrator email. Suggested names: `ironpulse-gym` and `ironpulse-gym-db`. Choose another Pages name if it is taken.
5. Enter a unique first-login password when asked for the `ADMIN_LOGIN_PASSWORD` secret. The helper writes the new database ID into `wrangler.jsonc`; the password stays in Cloudflare secrets.
6. Double-click **DEPLOY-GYM-WINDOWS.bat**. It applies the 56 migrations to the new database and uploads the frontend and Functions.
7. Open `https://YOUR-PROJECT.pages.dev/login`. Use the administrator email and password from steps 4–5. Open Brand Settings and replace the placeholder gym details.

This helper creates a Pages Direct Upload project. You can keep its source in a new GitHub repository using GitHub Desktop, and run the deploy helper after changes. For Cloudflare's built-in automatic Git deployments, use option B instead of creating a Direct Upload project.

Mac/Linux: run `bash SETUP-GYM-MAC-LINUX.sh`, then `bash DEPLOY-GYM-MAC-LINUX.sh` from the extracted folder.

## B. GitHub Desktop + Cloudflare automatic deployments

1. Create a new GitHub repository, for example `ironpulse-gym`. Copy the **contents** of the ZIP's project folder into it, commit, and publish. Keep that repository's own `.git` folder.
2. In Cloudflare, open **Storage & databases → D1 SQL database → Create database**. Create `ironpulse-gym-db` or another new name. Copy its database ID.
3. Edit `wrangler.jsonc` in the new repository:

| Field | Set to |
|---|---|
| `name` | New Pages project name |
| `d1_databases[0].database_name` | New D1 database name |
| `d1_databases[0].database_id` | New database ID from step 2 |
| `vars.SITE_URL` | `https://YOUR-PROJECT.pages.dev` |
| `vars.ADMIN_LOGIN_EMAIL` | Your email |
| `vars.ADMIN_EMAILS` | Your email |

Keep the binding **DB**. The all-zero database ID in this ZIP is a setup placeholder; the deploy helpers reject it and the original dance database ID.

4. In a terminal inside the repository, run:

```sh
npm ci
npx wrangler login
npm run d1:migrate:remote
```

5. In Cloudflare **Workers & Pages**, create a new **Pages** application connected to the new repository:

| Setting | Value |
|---|---|
| Project name | The `name` in `wrangler.jsonc` |
| Production branch | `main` |
| Framework preset | None |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `public` |
| Environment variable | `NODE_VERSION` = `24` |
| Secret | `ADMIN_LOGIN_PASSWORD` = your unique first-login password |

The Wrangler configuration supplies the DB binding and non-secret variables. Confirm **DB** points to the new gym database. Use a separate preview database if you enable preview deployments.

6. Deploy, then open `/login` with your configured administrator email and password. Existing dance customers, payments and integration tokens are not copied into this new database.

## Razorpay connection

1. Save the gym's Razorpay Key ID and Key Secret on its Admin payment integration card, or set Pages secrets `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. In Razorpay, create a **new webhook endpoint** for the gym. Keep the dance endpoint active for the dance site.
3. URL: `https://YOUR-GYM-DOMAIN/api/webhooks/razorpay`.
4. Choose a new webhook secret. Save the identical value as Pages secret `RAZORPAY_WEBHOOK_SECRET`, or in the webhook-secret field on the gym's payment settings card.
5. Enable the existing handler's events where available: `payment.captured`, `payment.failed`, `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.updated`, `subscription.pending`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.cancelled`, `subscription.completed`, `subscription.expired`.
6. Test in Test mode, then configure Live keys and the Live-mode webhook. Recurring-payment approval belongs to the gym's Razorpay account.

Optional Stripe and PhonePe keep their existing integration logic. If enabled, use the gym domain and its own secrets for `/api/webhooks/stripe` and `/api/webhooks/phonepe`.

## Google OAuth connection

Create a Web application OAuth client for the gym, or explicitly add its new callback URLs to a client you own. Enter credentials on the relevant card in the **new gym Admin** and reconnect its accounts. Do not copy refresh tokens from the dance database.

| Feature | Authorized redirect URI |
|---|---|
| Member, Coach and Admin Google sign-in | `https://YOUR-GYM-DOMAIN/api/portal/google/callback` |
| Google Meet / Calendar | `https://YOUR-GYM-DOMAIN/api/admin/webinar-google-oauth/callback` |
| Google Drive | `https://YOUR-GYM-DOMAIN/api/admin/google-drive-oauth/callback` |
| Gmail | `https://YOUR-GYM-DOMAIN/api/admin/gmail-oauth/callback` |
| Search Console | `https://YOUR-GYM-DOMAIN/api/admin/search-console-oauth/callback` |
| Blogger, if used | `https://YOUR-GYM-DOMAIN/api/admin/blogger-oauth/callback` |
| YouTube, if used | `https://YOUR-GYM-DOMAIN/api/admin/youtube-oauth/callback` |

Google sign-in can use credentials saved under Admin Security or the existing Webinars integration card. Other services retain their existing integration cards. Use the exact callback displayed by each card, add the gym origin where required, complete the OAuth consent screen and enable the APIs/scopes requested by that service.

If you attach a custom domain, update `vars.SITE_URL`, webhooks and authorized redirect URIs to that domain, redeploy, and reconnect services.

## After setup

- Confirm branding on Home, `/login`, Admin, `/member-dashboard` and `/coach-dashboard`.
- Rename a menu item or button, then check desktop, mobile and a normal reload.
- Enter real memberships, prices, coaches, specialties, photos and schedules. Demo prices retain the existing pricing logic and are editable.
- Complete a Test-mode purchase and check the order, membership, attendance and webhook result.
- Install the PWA and check its name and icon.

WhatsApp support: **9381521966**. Instautomate footer attribution is retained.

References: [Cloudflare Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/), [D1 setup](https://developers.cloudflare.com/d1/get-started/), [Google OAuth redirects](https://developers.google.com/identity/protocols/oauth2/web-server), [Razorpay webhook setup](https://razorpay.com/docs/webhooks/setup-edit-payments), [Razorpay webhook testing](https://razorpay.com/docs/webhooks/validate-test).
