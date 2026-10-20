# V16.19 — Instagram capability diagnostics, comments, publishing and concise Facebook DM errors

- Shortens known Facebook one-time-DM recipient/activity restriction errors (Meta 10903) for admin users while retaining upstream metadata internally.
- Adds Instagram Facebook-Login capability inspection and a live recent-media comment-read test.
- Adds Instagram Configure Webhook Events with verified status when the subscribed_apps edge is available and exact Meta App Dashboard guidance when it is not.
- Synchronizes comments from the Instagram professional account's recent media, not only posts already present in social_publish_log.
- Supports both Instagram webhook payload shapes: entry.field/value and entry.changes[].
- Keeps echo filtering and attaches Instagram account replies to the visitor comment where the replies endpoint reports them.
- Automatic Instagram Audition publishing remains an image post using the public Audition cover and an Apply CTA/article URL in the caption.
- Facebook publishing logic and the existing theme are not changed.
