# V15.4 — Direct SEO Auditions, Comments & Public Blog Layout

This is an additive update on top of V15.3. Existing payment, subscription, order, customer, tracking, API-settings, and Urgent Casting theme/color logic is preserved.

## Load Audition Updates repair

- `Load Audition Updates` now reads the selected SEO publishing source directly instead of first copying every remote post into D1.
- Published and Draft posts remain in the connected SEO source. The website does not create a second article/body copy in `blog_posts`.
- Blogger/SEO post IDs remain strings end-to-end, so long Google post IDs are not rounded by JavaScript.
- OAuth access tokens are reused safely during a fetch cycle instead of refreshing a token for every page of posts.
- The old `/api/admin/blogs` and `/api/admin/blogger-sync` routes are retained as compatibility routes, but they now use the direct SEO source and do not write article copies to D1.
- Errors now return a useful error plus a recovery hint instead of leaving the admin stuck on “Loading audition updates…”.

## Auditions workspace

- New = live posts published within the last 7 days.
- Published = older live posts.
- Drafts = SEO drafts.
- Deleted = posts moved to a hidden SEO Draft state with Urgent Casting metadata. This keeps recovery history in the SEO source without creating a website database copy.
- All = complete active/hidden SEO workspace.
- Sort uses one filter icon only. The menu contains Newest to Oldest and Oldest to Newest and closes when the admin clicks elsewhere.
- Draft rows retain one-click Post.
- Published rows retain Move to Draft.
- Ads column retains Custom / Manual / Automatic states.
- Featured continues to be stored with the SEO post metadata.

## Public Audition Updates

- Main editorial images are restored to a wide horizontal presentation while the V15.3 no-overlap text fix is retained.
- Improved heading typography/spacing from V15.3 is preserved.
- Featured, Recent Posts, Tags, Most Popular and Random Picks remain visible as sidebar blocks.
- Empty Featured / Most Popular / Random Picks blocks show visitor-friendly messages instead of disappearing.
- Sidebar items are de-duplicated so the same article is not repeated through every block when alternatives are available.
- Public blog listing, article details and Open Graph article metadata now read live SEO posts directly.

## Comments

- Business Dashboard replaces Recent Leads with Comments.
- Website Content adds Comments immediately beneath Auditions.
- Comments filters: New, Responded, Resolved and All. New is the default; newest comments appear first.
- Comment grid shows article image/title, commenter, comment, status and actions.
- Article title opens the public audition article.
- Matched commenter names open Client Details.
- Pencil opens an admin reply modal. Admin replies can include text and an optional uploaded image and display an Admin badge publicly.
- Resolve and Delete actions are available from the grid.
- Public comments support replies/threading.
- Public comment form uses Name plus optional WhatsApp Number. WhatsApp is never exposed on the public comments list; it is used only for CRM matching/linking.
- Comment data is stored in the separate `seo_comments` table linked by the remote SEO post ID. Article bodies are not stored in this comments table.

## Database

The application schema version is now `v15-4-seo-direct-comments` and auto-creates `seo_comments` on the first `/api/*` request after deployment. Migration `0018_seo_comments_remote_posts.sql` is included as a backup for explicit migration workflows.
