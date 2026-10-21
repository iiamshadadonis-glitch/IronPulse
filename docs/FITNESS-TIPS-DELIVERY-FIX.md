# V1.06 Fitness Tips layout delivery and cache busting

## What caused the regression

The duplicate cover fix in the V1.05 public renderer worked. Its card stylesheet was added to public/blog.html and public/blog-post.html, but Cloudflare serves /blog and /blog/[slug] through functions/blog/[[slug]].js. That separate generated shell never linked the V1.05 stylesheet. Clearing a cache alone could not make the missing link appear. The earlier browser harness served the static HTML and therefore missed this production route.

The V1.06 regression reproduces the missing stylesheet using the original generated route and middleware. The fixed tests also run Chromium against an actual local Cloudflare Pages Worker, including its generated shell, middleware injections and asset headers.

## Implementation

The middleware calls one additive HTML/asset delivery helper after its existing presentation injections. For a blog-list body, the helper appends gym-fitness-tips-v1-06.css as the final stylesheet. This covers /blog, the existing /fitness-tips redirect and generated or navigation-alias shells with the same page loader. The routing, post fetching, APIs and saved content are retained.

Desktop cards use balanced image/text columns, 24px gaps and 24px padding. At widths up to 760px, the image fills the card and the text container is absolutely positioned over it. A dark gradient provides legibility; Read More uses the existing primary theme token. Excerpts are limited to four lines and very long copy can scroll within its card instead of escaping the image. All inherited colour declarations remain intact.

The new build:assets step hashes every public CSS/JS source. Its deterministic manifest supplies a URL such as /assets/styles.css?ip=V1.06.BUILD_HASH.FILE_HASH. Changing any asset changes the build hash; changing a file also changes that file's hash. The final HTML helper updates local script/link URLs while retaining existing query parameters, load order and attributes. An import map versions literal local ES module dependencies without editing those modules. Third-party URLs, API requests and existing application data are unchanged.

HTML responses use no-store, including generated shells requested without an HTML Accept header. CSS/JS responses revalidate with no-cache, max-age=0, must-revalidate and no stale-while-revalidate allowance. This also covers compatibility URLs used by existing dynamic loaders. There is no cache interception in the notification service worker, and its push/click behaviour remains unchanged.

## Deploy on the existing pages.dev project

1. Replace the existing gym repository's project contents with every file and folder from V1.06.zip, keeping its .git folder. Keep the project at the repository root.
2. Commit and push to the production branch used by the existing Cloudflare Pages project serving https://gym-fitness-3w8.pages.dev. Use GITHUB-SUMMARY.txt for the title/description. Keep your current secrets and DB binding.
3. In that Pages project's build settings, use Framework None, Root directory blank, Build command npm run build, Output directory public and Node 24. The build command is required for future asset changes to regenerate the manifest.
4. Deploy the new commit. The log should identify V1.06 / 1.6.0, fingerprint 415 CSS/JS assets and compile the Worker successfully.
5. After success, open https://gym-fitness-3w8.pages.dev/release.json and confirm V1.06 / 1.6.0. Open /fitness-tips or /blog on desktop and mobile. A normal reload discovers the new asset URLs; Ctrl+Shift+R can be used once for an already-open tab.

Use the existing Pages project and database. The root configuration retains the existing gym UUID. If deploying through the optional CLI, first set wrangler.jsonc name and SITE_URL to the actual existing Pages project and origin, as explained in START-HERE.md. No new database or migration is required.

## Cloudflare cache purging

For the current pages.dev hostname, Cloudflare owns the DNS zone and Pages manages its deployment asset cache. The project user cannot issue a zone purge for pages.dev. The new build URLs ensure that old browser/CDN URLs are not selected by the new HTML. Clearing the Pages build cache is a different operation from clearing visitor/CDN caches.

If a custom domain has additional Cloudflare caching, a post-deployment purge tool is included. Set GYM_CACHE_PURGE_ORIGIN to that exact HTTPS origin, CLOUDFLARE_ZONE_ID to its zone and CLOUDFLARE_API_TOKEN to a token with Cache Purge permission. Keep the token in your local/CI environment, outside committed files. Run npm run purge:css after Cloudflare reports a successful deployment. It submits only CSS file URLs, in batches of at most 25, and checks every API result. The optional npm run deploy helper runs asset building, deployment and then this purge step in that order. Git-connected Pages builds do not run that CLI helper; use the post-deployment command for a custom zone if needed.

The purge helper processes the unversioned CSS paths and current fingerprinted URLs from the manifest. Earlier query-string variants can remain cached but are bypassed by the new HTML's build URLs. For a manually configured custom-domain cache rule that also caches HTML, use Cloudflare's zone Caching settings to purge the affected HTML URLs after deployment, or remove that HTML cache rule. The supplied Worker sends no-store for HTML.

No live Cloudflare purge or deployment was performed from this verification session: account credentials were not available. Purge API behaviour is tested with synthetic responses. The real cache regression uses Chromium's actual HTTP cache without request interception, retains a stale stylesheet in cache and confirms that the new build URL loads the corrected layout.

Cloudflare references:

- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://developers.cloudflare.com/api/resources/cache/methods/purge/
- https://developers.cloudflare.com/pages/configuration/build-caching/

## Verification and preservation

The original compatibility baseline remains intact. V1.06 audits only the middleware delivery addon, new delivery helper/manifest and one new stylesheet. Removing the declared middleware additions restores its V1.05 bytes exactly. All other 267 inherited backend files, all 178 inherited CSS files, all inherited public JavaScript files and all 56 migrations are byte-identical. The previous duplicate-image and Admin stability fixes remain included. See RELEASE-VERIFICATION-GYM.md and verification/ironpulse-v1.06/ for the final results.
