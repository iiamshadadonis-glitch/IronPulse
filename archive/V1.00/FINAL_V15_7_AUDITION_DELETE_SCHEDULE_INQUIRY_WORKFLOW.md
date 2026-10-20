# Urgent Casting V15.7 — Audition Delete, Scheduling, Full D1 Merge & Inquiry Workflow

This update is additive to V15.6. Existing theme colors, payment logic, CRM identity matching, subscription logic and unrelated workflows are unchanged.

## Auditions

- Delete from New / Published / Drafts / Scheduled now permanently deletes the actual Blogger/SEO post and removes it from the public website.
- Before deletion, the admin receives a destructive-action warning.
- After successful Blogger deletion, a complete reference snapshot is retained only in D1 under **Deleted**.
- Deleted rows support Edit, Repost, and permanent D1 removal.
- Repost creates a new Blogger post ID because the original Blogger resource was permanently deleted.
- A **Schedule this post** toggle adds Schedule Date and Schedule Time without changing the existing Post Audition Update button.
- Scheduled posts are created as Blogger drafts and published with a future Blogger `publishDate`.
- Existing Auditions filters are now New / Published / Scheduled / Drafts / Deleted / All.
- Published includes all live posts, including posts also shown in New.

## First full D1 merge

V15.7 increments the Auditions synchronization generation. The first **Load Audition Updates** after deployment automatically continues bounded Blogger pages until live, draft, and scheduled posts have all been merged into D1. Existing cache rows are deduplicated by `(blog_id, post_id)` rather than duplicated. The browser continues the bounded backend pages automatically, so one **Load Audition Updates** click can finish the initial merge without one oversized Worker request.

The grid response intentionally omits full article bodies; the complete body remains in D1 and is loaded by post ID only when Edit is opened. This keeps a large Auditions list lighter without changing the editing workflow.

After the first full merge, the V15.6 incremental approach remains in use:

- D1 renders first.
- Blogger metadata is ordered by `updated`.
- A 31-day safety window / overlap is used.
- Full article bodies are fetched only for changed or new posts.
- A historical post edited today is detected from its updated timestamp.

## Article comments and Enquiries

- User-facing wording now uses **Comment on article** / `article_comment`, not Blog Comment / `blog_comment`.
- Article comments continue to appear in both Comments and Enquiries.
- Replying to a comment resolves its matching enquiry and adds an Admin reply event to Client Details → History.
- Deleting a comment removes its enquiry row from the active enquiry workspace.
- Client History labels comment interactions as Website Comment / Comment and reply interactions as Comment Reply / Responded.

## Enquiry seen workflow

- Entering Enquiries opens New.
- New enquiry rows actually viewed during that visit are remembered in the browser session.
- When the admin leaves Enquiries, only those viewed New rows are moved to In Progress.
- The sidebar badge shows the current New/unseen count.
- Dashboard Follow-ups → Inquiries shows New + In Progress until those enquiries are resolved.
- Legacy enquiry rows are upgraded into their own submission row when first seen so they participate in the same workflow without deleting the existing client record.

## Orders UI

- The New Orders status selector keeps the same underlying `<select>` values and existing Save logic.
- A compact themed trigger replaces the browser-native arrow visually.
- Its option menu is rendered at the document level so it cannot be clipped by the order grid.
- The menu shows approximately three choices at once and scrolls when more choices exist.
