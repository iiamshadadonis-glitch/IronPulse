# V15.6 — CRM Gateway Identity + Incremental Audition Index

This is an additive update on top of V15.5. Existing theme/colors, checkout, order, refund, client-details, payment configuration, tracking, comments and public website logic are preserved.

## 1. Subscription Overview → Client Details identity repair

The existing CRM candidate/dropdown design is preserved.

The issue was in the Subscription Overview identity-sync guard: a gateway row was skipped as soon as it already had a `client_ref`. That meant a client could be correctly matched by an existing email address, become clickable in Subscription Overview, and still fail to receive a newly discovered Razorpay phone number as the current field/candidate.

V15.6 removes only that incorrect skip. Gateway identity enrichment still uses the existing `mergeGatewayIdentity()` rules:

- gateway data never creates a new gateway-only CRM lead;
- an existing local client must match by the existing permitted exact phone/email rules;
- a blank current field can be filled automatically;
- a different non-blank value becomes a candidate in the existing dropdown;
- the candidate source remains the gateway name, such as Razorpay;
- existing profile/contact/device merge logic is otherwise unchanged.

## 2. Razorpay UPI and previous bill details

Subscription list responses already provide subscription contact/email and payment-method information. UPI VPA and the actual previous paid amount/date can require the related invoice/payment details.

V15.6 repairs the list enrichment so that:

- UPI rows with a known payment method but a missing UPI ID are still eligible for detail enrichment;
- the Razorpay subscription-invoice request uses the supported `subscription_id` query without the previous unsupported extra `count` argument;
- the latest paid invoice supplies previous bill date, previous billed amount and payment ID;
- the payment record supplies UPI VPA, payment contact and payment email when available;
- newly learned contact/email information is sent through the same existing CRM candidate merge logic;
- enriched Active/Total/New/Upcoming snapshot rows are written back to the existing Subscription Overview D1 cache so later modal opens can show the saved details immediately.

The existing Previous Bill column now shows both the date and the previous billed amount when the gateway returns both values. If the normal plan amount is unavailable, the latest actual paid invoice amount is used as a display fallback.

## 3. Auditions — New and Published counts

The existing 7-day New rule is preserved.

- **New** = published updates from the last 7 days.
- **Published** = every currently published update, including the updates also counted under New.
- **Drafts** = draft updates.
- **Deleted** = recoverable deleted/draft records marked by the existing metadata.
- **All** = the complete saved admin index.

Therefore, if there is one new published article and one older published article, New shows `1` and Published shows `2`.

## 4. Clickable Audition Update titles

The existing Actions buttons remain unchanged.

- Published/New published title → opens `/blog/<slug>` in a new tab.
- Draft title → runs the existing Edit Audition Update action.
- Deleted title → remains plain/non-clickable.

No theme or color changes were introduced.

## 5. D1 Audition admin index + incremental Blogger checks

Blogger/SEO remains the publishing source of truth. Create, edit, publish, move-to-draft and delete/recoverable-delete actions still operate on Blogger directly.

V15.6 adds two admin-index tables:

- `audition_post_cache`
- `audition_sync_state`

### First load

The first Load Audition Updates request builds the D1 admin index from Blogger in bounded pages. Continuation tokens are saved after each page, so a temporary API/Worker interruption does not force a large history import to restart from page 1.

For very large blogs, the first index can continue safely over more than one Load action instead of trying to download tens of thousands of full articles in one Worker request.

### Later loads

After the initial index is complete:

1. the existing D1 rows are available as the admin list;
2. Blogger is queried in `orderBy=updated` order with bodies/images disabled for the lightweight change check;
3. only recent metadata is inspected, with a 31-day safety window and a 24-hour overlap from the last remote update;
4. only post IDs whose Blogger `updated` value/status is new or changed are fetched in full and overwritten in D1;
5. unchanged historical post bodies are not downloaded again.

An old article edited today is still detected because Blogger's updated ordering places that changed post among the recent updates even if its original publication date is years old.

If a recent Blogger check temporarily fails but the D1 index already exists, Auditions keeps showing the saved index and reports a warning instead of replacing the grid with an empty error state.

## 6. Storage → Delete Existing Blog Copies

This existing card remains D1-only and never imports/calls Blogger for deletion.

It can now review both:

- old legacy `blog_posts` copies; and
- rebuildable `audition_post_cache` admin-index rows.

Deleting a legacy row removes only its legacy D1 tag/comment children. Deleting an admin-index row clears only that D1 cache row and resets its sync marker so a later Load Audition Updates can rebuild the index safely from Blogger. `seo_comments` and live Blogger articles are never deleted by this cleanup route.

## 7. Storage detail modal stacking

The item-detail modal now has a higher stacking level than the Delete Existing Blog Copies review modal. Clicking an item therefore shows its details in front; closing the item returns to the still-open cleanup review.

## Database auto-create

Schema version: `v15-6-crm-audition-incremental-cache`.

The two Audition cache tables are created automatically by the existing schema flow. Migration `0020_audition_incremental_cache.sql` is also included for installations that explicitly apply Wrangler migrations.
