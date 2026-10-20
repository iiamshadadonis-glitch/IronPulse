# V16.65 — Instagram DM Automation Trigger Reliability

## Reported behaviour

Facebook DM flows triggered correctly from an exact keyword, while Instagram DMs were visible in Admin → Social Media → Inbox but the enabled Instagram flow did not start.

## Root cause

V16.64 had two independent ways for a Meta DM to reach the unified Inbox:

1. the realtime Meta webhook (`entry[].messaging[]`), and
2. the lightweight Conversations API background sync used by Inbox refresh/polling.

The automation engine was called only from the realtime webhook path. The background Meta sync stored new messages in D1 but did not call `runDmAutomationAfterInbound()`.

For the connected Instagram account, the background Inbox sync could receive/store a new Instagram message before the webhook path processed it. The message therefore appeared correctly in Inbox, but no automation was started. A later webhook for the same Meta message ID saw that D1 already contained the message and V16.64 skipped the automation because it ran automations only when the message insert was new.

Facebook webhook delivery was fast enough in the reported test that Facebook normally reached the automation path first, which is why the same Flow Builder logic appeared to work for Facebook.

## V16.65 changes

- New inbound messages imported by the Meta Conversations API can start the same DM automation engine used by webhooks.
- On a brand-new sync, only a very recent imported message can start an automation, preventing old Inbox history from suddenly triggering chatbots.
- Added an exactly-once automation event claim table keyed by channel + platform + external event/message ID.
- If webhook delivery and background synchronization see the same Instagram/Facebook message at nearly the same time, only the first path is allowed to execute the flow.
- A live Meta webhook may recover an automation even when the corresponding Inbox message was already inserted by synchronization.
- Exact keyword matching remains case-insensitive, so `Hi`, `HI`, and `hi` match the saved trigger `hi`.
- X/Twitter polling was given the same new-message automation recovery behaviour, so an X DM flow is not dependent on a webhook that may not exist for the current connection.
- Added a safe Instagram Quick Reply fallback. The system first tries the native Instagram quick-reply payload. If Meta rejects that rich format for the current account/app configuration but normal Instagram messaging is available, the flow sends a numbered text choice instead and keeps the flow session active.
- Existing Facebook DM automation, Inbox, Comments, payment, navigation, theme, and Flow Builder UI logic are unchanged.

## Database

`social_automation_events` is created automatically at runtime. Migration `0033_v16_65_instagram_automation_event_dedupe.sql` is included for schema documentation/managed migration workflows.
