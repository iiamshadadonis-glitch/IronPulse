# Urgent Casting V16.44 — LinkedIn Products / Scopes, Duplicate Actions & Help Fix

This build is based on the verified V16.43 replacement and makes targeted LinkedIn/X Social Media API corrections without changing the existing theme or unrelated business logic.

## LinkedIn OAuth connection correction

LinkedIn OAuth permissions are provisioned by LinkedIn Developer **Products**. A saved Client ID, Client Secret and redirect URL do not create scopes by themselves.

V16.44 changes the LinkedIn OAuth request so that the first connection is minimal:

- Basic OAuth requests only `openid profile`.
- Member publishing requests `w_member_social` only when automatic publishing is enabled.
- Organization/Page publishing requests `w_organization_social` only when automatic publishing is enabled.
- Community Management scopes are requested only when the Community Management switch is enabled.
- Lead Sync scopes are requested only when Lead Sync is enabled.
- Advertising scopes are requested only when Advertising API preparation is enabled.
- The invalid/nonexistent `r_member_social_feed` request was removed. Member read access remains subject to LinkedIn's restricted `r_member_social` program.

This prevents a future Organization/Page selection from making the basic OAuth authorization fail before the matching LinkedIn Product has been granted.

## Required LinkedIn Products

- Minimum basic connection: **Sign in with LinkedIn using OpenID Connect**.
- Personal/member posting: **Share on LinkedIn** (`w_member_social`).
- Organization/Page publishing and Page comment/reaction management: **Community Management API** or another approved LinkedIn program that grants the required organization social permissions.
- Lead Gen Form sync: **Lead Sync API**.
- Advertising: **Advertising API**.

If LinkedIn Developers → Auth displays **No permissions added**, request the relevant Product(s) on the app's **Products** tab first.

## Duplicate LinkedIn buttons

The duplicate Connect LinkedIn / Test Connection / Disconnect buttons were caused by the older V16.8 compatibility enhancer appending its own action group after the newer V16.43 LinkedIn form had already created a complete native action row.

V16.44 adds a compatibility guard so the enhancer recognizes the newer native actions and never appends a duplicate group.

## Information helpers

The LinkedIn and X/Twitter flip-card help is refreshed with the current form fields and solution-oriented instructions. Existing help panels are updated in-place even when an older helper created the panel first.

The LinkedIn helper now explains Products, scopes, callback URL, Organization ID, Community Management, Lead Sync, Advertising and the current `202608` API version.

The X/Twitter helper now explains OAuth 2.0 Client ID/Secret, callback URL, Connected X User ID, pay-per-use credits, Test Connection vs Test Posting, and the separate role of the Activity Webhook.
