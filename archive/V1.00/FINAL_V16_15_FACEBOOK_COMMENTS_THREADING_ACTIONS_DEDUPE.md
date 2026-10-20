# V16.15 — Facebook comments threading, action state and duplicate-publish protection

This release is an additive follow-up to V16.14. It keeps the existing theme and unrelated website/business logic intact.

## Facebook comments workspace

- Facebook post rows now resolve the matching social publishing record so the Post column can show the Audition title, cover image, final article URL and real post publication time instead of a generic “Social post”.
- Meta webhook Unix timestamps are normalized correctly, preventing 1970 dates.
- The original Facebook commenter identity is preserved. Page-owned/admin replies are filtered from the incoming-comment list and attached beneath the original visitor comment.
- A later visitor comment/reply remains a separate actionable comment. An admin/Page reply is not promoted to New or In Progress.
- Facebook commenter names are links when Meta supplies an identifier that can be represented as a Facebook profile URL.
- Remote states are persisted for Like, Hide, Spam, Delete, Resolved and Private Reply. Successful action buttons visibly remain active in the dashboard.
- Like and Hide are toggleable where the platform reports those capabilities.
- Hide/Spam actions are capability-gated using Meta's per-comment fields. If Meta refuses a hide operation, the admin receives the real Meta status/code plus a solution-oriented explanation rather than a bare “unknown error”.
- Facebook private reply is shown only when Meta reports `can_reply_privately` for that exact comment and the local eligibility window remains open. It is never presented as guaranteed for every Facebook commenter.
- Direct-message webhook echoes (`message.is_echo`) and Page-owned comment/reply echoes are ignored.

## Comment grid

- The five-column Comments grid no longer forces a horizontal scrollbar on desktop.
- Post, Commenter, Comment, Status and Actions have bounded column shares with wrapping/padding so columns do not collide.
- On narrow/mobile screens the table converts to stacked rows rather than horizontal scrolling.
- The same layout applies to Audition Articles and enabled social-platform comment tabs.
- Admin responses appear beneath the original incoming comment in the same Comment cell.

## Audition article comments

- Website article comments use the same one-incoming-comment/one-admin-response presentation.
- An existing admin response cannot be submitted again for the same incoming comment. A later visitor comment creates a new actionable row.

## Duplicate social publishing protection

- Social publishing now claims a final article URL before performing the remote side effect.
- Existing successful publish-log rows from older versions are honored even if they used a different article key.
- Immediate publish and scheduled/catch-up publishing cannot concurrently publish the same article/platform when a live claim exists.
- A six-hour crash-safe in-progress lock prevents the normal sweep from repeating a post after a request was already claimed.
- Facebook, Instagram, Threads, LinkedIn, X, Pinterest and Google Business Profile publishing use the same URL-based duplicate guard where those integrations already support automatic publishing.

## Database additions

Migration `0028_v16_15_social_comments_threading_actions_dedupe.sql` adds:

- `post_published_at`
- `parent_comment_id`
- `admin_reply_text`
- `admin_reply_at`
- `admin_reply_author`
- `admin_reply_external_id`
- `remote_liked`
- `remote_hidden`
- `remote_deleted`

The runtime schema bootstrap also guards these additions so an existing D1 database can be upgraded safely by the application's normal schema initialization.

## Recommended verification after deployment

1. Open Comments → Facebook and press Refresh. A current Facebook comment should show the Audition image/title and correct date/time.
2. Reply once. The visitor row must remain, and the Page reply must appear beneath it rather than as a new incoming row.
3. Like the visitor comment. The Like action should remain visibly active; click again to remove the Like if Meta permits it.
4. Hide a visitor comment for which Meta reports `can_hide`. The Hide action should remain visibly active and can be toggled back.
5. Create one fresh Audition with Facebook auto-publishing enabled. Confirm only one Facebook Page post is created, including after the catch-up sweep runs.
6. Where Meta reports a Facebook comment is eligible for a private reply, use the Message action and verify it is sent once only.

