# V15.3 — Enquiries, SEO, Auditions & Sharing

This is an additive update on top of V15.2. Existing payment, subscription, customer, order, theme, and website-color logic is preserved.

## Enquiries

- Repairs the mismatch where the Enquiries menu could show a count while the workspace showed no rows.
- Combines current contact-form submissions with older contact leads that existed before the inquiry-workflow table was introduced.
- Tabs are ordered: New → In Progress → Resolved → All.
- New is the normal Enquiries-page default. Dashboard follow-up shortcuts may still open In Progress as the work queue.
- Newest enquiries appear first.
- Removing an enquiry from the workspace does not delete the client record.

## Auditions admin

- Adds New, Published, Drafts, Deleted and All filters.
- New = published within the last 7 days; Published = older live posts.
- Newest to Oldest is default, with an optional Oldest to Newest sort control.
- Draft rows include a one-click Post action.
- Published rows include Move to Draft.
- Deleted is retained as admin history and can be restored by editing/saving again.
- Adds an Ads column: Custom, Automatic, Manual Ads or None.
- Adds Featured Audition. Only one explicitly featured published audition appears in the public Featured sidebar.
- Automatic/manual ad-network placements are blocked until an enabled ad integration is configured. Direct Custom Advertisements remain allowed.

## SEO connection terminology

The admin now uses client-facing SEO terminology instead of Blogger terminology. Backend Google/Blogger OAuth fields and endpoints are intentionally unchanged for compatibility.

- SEO Connection
- SEO API Key Optional
- SEO Name
- Manual SEO ID Optional
- Retry SEO Check
- Connect SEO ID
- Save SEO Connection
- Connect SEO / Disconnect SEO

The publishing warning in Post New Audition is shown only when the SEO publishing connection is unavailable.

## Public Audition Updates

- Fixes article-card image/text overlap without changing the existing theme.
- Featured shows only the explicitly featured post (maximum one).
- Recent Posts shows up to three recent unique posts.
- Tags appear immediately after Recent Posts.
- Most Popular uses article view counts and shows up to three unique posts.
- Random Picks shows up to three random unique posts.
- Sidebar groups are de-duplicated so the same article is not repeated across every block.
- Follow Us On is removed from the Audition Updates sidebar.
- Article pages add icon-only sharing controls after tags and before More Audition Updates.
- Open Graph and Twitter large-image metadata use the article cover image for link previews.

## Database

V15.3 adds one additive field to `blog_posts`: `is_featured`. The normal application schema bootstrap handles this automatically. Migration `0017_audition_featured_inquiry_workflow.sql` is also included for deployment workflows that apply migrations explicitly.
