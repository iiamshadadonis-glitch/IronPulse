# V16.17 — Facebook Comments Private Reply + Badges + Routing

This release is additive to V16.16.

## Facebook private message behavior
The Facebook comment action remains available for seven days after a visitor comment unless a private reply has already been successfully sent. The server first attempts Meta's comment-specific private reply through `/PAGE_ID/messages` with `recipient.comment_id` set to the Facebook comment ID. It does not disable the button merely because a reduced Graph comments response omitted `can_reply_privately`.

If Meta rejects that one-time comment private reply, the server checks whether the same Page-scoped user has sent the Page a Messenger message within the preceding 24 hours. Only in that proven case does it fall back to the ordinary `/PAGE_ID/messages` recipient-ID flow with `messaging_type=RESPONSE`.

## Facebook post context
The Comments table uses the title, cover image and publication time already recorded by the website in `social_publish_log`. The click target is a Facebook post permalink, not the Blog article. Flexible external-ID matching handles both `PAGEID_POSTID` and post-only ID shapes.

## Hide / Unhide
The local row moves to Hidden only after the Facebook Graph request succeeds and a follow-up read confirms `is_hidden=true`. Unhide requires `is_hidden=false`. Failed verification rolls the optimistic action back.

Facebook itself may continue showing a hidden Page comment to the person who wrote it and that person's friends. That is platform behavior, not a failed hide.

## Comment notification totals
The dashboard Comments card, Website Content → Comments badge, and enabled platform tabs use one unified pending summary. New/In Progress items count for seven days. Responded, Resolved, Hidden, Spam and Deleted items do not count.

## Notification deep links
Notification data contains platform, status and comment ID. The service worker both navigates the admin window and posts a route message to an already-open admin app so the notification opens the correct Comments platform instead of Dashboard.
