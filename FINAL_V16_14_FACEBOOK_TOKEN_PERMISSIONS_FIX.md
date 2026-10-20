# V16.14 — Facebook Page Token, Permissions, Webhook and Publishing Fix

This update is additive to V16.13. Existing visual theme, payments, Audition publishing, other social integrations, CRM, comments and notification logic are preserved.

## What the two Meta errors mean

- **HTTP 403 / Meta code 200 during Page publishing**: Meta reached the app/token but refused the Page write. The Page token needs the Page publishing permission and the person/system user that created it must have the required Page task/access.
- **HTTP 403 / Meta code 210 on `/PAGE_ID/subscribed_apps`**: the token being used for Page subscription management is not accepted by Meta as the required Page Access Token for that Page (or is otherwise not valid for that Page operation). Verifying the callback URL does not validate Page-token permissions.

## Code corrections

1. Facebook Test Connection now verifies `/me` with the saved token and requires the returned ID to exactly equal the configured Facebook Page ID. A readable User token can no longer be incorrectly labelled as a fully working Page connection.
2. Optional Meta token inspection uses the saved App ID + App Secret to report granted scopes/capability readiness.
3. Current Meta Page task names such as `PROFILE_PLUS_CREATE_CONTENT`, `PROFILE_PLUS_MODERATE`, `PROFILE_PLUS_MANAGE`, `PROFILE_PLUS_FULL_CONTROL` are recognized in addition to older task names.
4. Webhook configuration no longer submits every event group as one all-or-nothing request. It preserves existing fields and adds Page activity, Lead Ads and Messenger groups incrementally, reporting exactly which group Meta accepted/refused.
5. A stale automatic-publishing error no longer overwrites a newer successful Test Connection result in the admin card.
6. Facebook Connect now supports the recommended Facebook Login for Business flow. Save App ID, App Secret and Configuration ID; the callback gets the managed Pages using `/me/accounts`, selects the exact Page ID and stores the Page Access Token returned for that Page.
7. Disconnect clears Facebook token/readiness state but preserves the non-secret connection setup values needed to reconnect.

## Recommended Meta permissions for the complete Urgent Casting Facebook feature set

Configure the Facebook Login for Business configuration and App Review/access as applicable for:

- `pages_show_list` — discover the Pages the authorized user manages.
- `pages_read_engagement` — basic Page engagement access.
- `pages_manage_posts` — automatic Audition Page posts.
- `pages_manage_metadata` — programmatic Page webhook subscription management.
- `pages_messaging` — Messenger send/receive operations.
- `leads_retrieval` — Facebook Lead Ads retrieval.
- `pages_manage_engagement` + `pages_read_user_content` — comment/reply/moderation features where Meta permits them.

The authorized Facebook account must also have the matching Page tasks/full control. For real events from people who are not app roles, Meta may require Advanced Access/App Review and the app to be in the appropriate live/production state.

## Admin workflow after deployment

1. Open Settings → Social Media API → Facebook.
2. Save Meta App ID, Meta App Secret, Facebook Login for Business Configuration ID, Page ID and webhook verify token.
3. Add the Facebook OAuth Redirect URL shown by the website to the Meta app/configuration.
4. Click Connect Facebook and approve the configured permissions.
5. Click Test Connection. Read the capability box; publishing should show Ready before testing an Audition post.
6. Click Configure Webhook Events. The result lists the fields Meta actually accepted and any permission still missing.
7. Keep Automatically publish new Auditions enabled and publish a fresh test Audition.

The Messenger Dashboard's “Verify and save” callback step confirms only that Meta can reach the webhook and that the verify token matches. It does not by itself grant `pages_manage_posts`, `pages_manage_metadata`, `pages_messaging`, Lead Ads access or Page tasks.
