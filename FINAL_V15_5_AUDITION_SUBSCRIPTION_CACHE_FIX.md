# V15.5 — Audition Grid Repair + Subscription Overview D1 Cache

This is an additive update on top of V15.4. Existing theme/colors, checkout, order, refund, client-details, payment, tracking and public website logic are preserved.

## Audition loading — actual UI bug repaired

The Blogger/SEO API was already returning the remote posts successfully, which is why the admin could report messages such as “Loaded 1002 audition update(s)”. The zero-row grid was caused by two different JavaScript state objects being used after the response arrived:

- `admin.js` creates the main admin state as the top-level lexical `A` object.
- The V15.4 audition renderer was reading `window.A.blogs`.
- A top-level `const A` is not automatically the same property as `window.A`, so the success message could use the fetched array while the renderer still saw an empty array.

V15.5 writes the fetched SEO posts into the existing `A.blogs` state and mirrors the same array to `window.A.blogs` for compatibility. The renderer prefers the real `A.blogs` state. New / Published / Drafts / Deleted / All therefore use the same fetched post collection.

## Blogger/SEO remains the article source of truth

- Audition posts are read directly from the selected SEO/Blogger source.
- New audition updates and edits are posted directly to SEO/Blogger through `/api/admin/seo-posts`.
- The active `/api/admin/blogs` route remains only a compatibility alias to the same direct SEO route.
- The compatibility Blogger sync endpoint remains read-only.
- No active audition create/edit/load route inserts or updates `blog_posts` in D1.
- The Ads column remains visible. A post with no ads simply shows `None`; missing ad-network configuration does not block loading existing posts.
- Ad integration is validated only when saving a post that actually requests Automatic Ads or an ad-network placement. Custom advertisements remain supported independently.

## Storage → Safe Cleanup — legacy D1 blog copies

A new final Safe Cleanup card is included:

**Delete Existing Blog Copies**

It reviews and deletes only old `blog_posts` rows accidentally/previously synchronized into D1, together with their legacy `blog_post_tags` and legacy `blog_comments` children.

Safety guarantees:

- It does not import or call the Blogger/SEO API.
- It does not delete or modify a live Blogger/SEO article.
- It does not delete current `seo_comments`.
- Review, Delete Selected and Delete All Eligible operate only on the legacy D1 copy.

This keeps the legacy table available as a safety net for future cleanup without making D1 the active audition article source.

## Subscription Overview — cache-first D1 design

Two dashboard-only tables are auto-created:

- `subscription_overview_cache` — latest normalized subscription snapshot per enabled gateway + subscription ID.
- `subscription_overview_activity_cache` — successful/failed/cancelled activity used by the existing period views.

These tables are used only by `/api/admin/subscription-overview`. They are not used by checkout, orders, refunds, customer billing or the public website.

### How the dashboard now behaves

1. When a Subscription Overview card/modal opens, the admin first reads the saved D1 snapshot.
2. Existing saved rows are displayed immediately when available.
3. The same existing live gateway refresh then runs and the UI continues to show “fetching” while the saved rows remain visible.
4. Fresh gateway rows overwrite the matching cached subscription IDs.
5. If a subscription changes status, the single cached snapshot is updated; the unchanged existing grouping logic then places it in Active, Cancelled, Failed, etc. as appropriate.
6. A disabled/unconfigured gateway is not refreshed and its cache is not changed by that refresh.
7. If a live gateway refresh fails, the already-saved rows remain visible rather than blanking the modal.

The existing Client Details linking behavior is preserved. Cached rows retain the same `client_ref` used by the live rows, so matched client names remain clickable.

## Subscription refresh performance repair

The live logic still reads the enabled gateway(s), but unnecessary work was reduced:

- Razorpay subscription pagination remains at the documented 100-record page size.
- The subscription response's customer phone, email and payment-method fields are used directly when present.
- The previous full Razorpay customer-catalogue scan is no longer used by Subscription Overview.
- Existing matched CRM clients are not re-merged on every refresh.
- Unresolved identity matching is processed in small parallel batches instead of one subscriber at a time.
- List payment-method detail enrichment remains best-effort and limited so informational fields cannot hold up the entire list indefinitely.
- Cache writes use D1 batch operations in bounded groups.

The very first Subscription Overview refresh after deployment may still need to populate the new cache from the enabled gateway. After that, saved data can be shown before the next live refresh completes.

## Database auto-create

The schema version is `v15-5-audition-subscription-cache`. The two Subscription Overview cache tables are created automatically by the existing `ensureSchema()` flow on the first `/api/*` request after deployment. No manual D1 SQL is required. Migration `0019_subscription_overview_cache.sql` is also included for projects that explicitly use Wrangler migrations.
