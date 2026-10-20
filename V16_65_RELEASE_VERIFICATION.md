# V16.65 Release Verification

## Scope

V16.65 is a narrow reliability update to the V16.64 social DM automation runtime. It does not change the visual Flow Builder, theme, navigation, payment screens, Inbox UI, Comments UI, or existing Facebook flow behavior.

## Root issue reproduced

V16.64 stored new Meta messages from two sources: the realtime webhook and the Inbox Conversations API synchronization. Only the webhook path invoked the DM automation engine. This allowed an Instagram DM to appear in Inbox without starting its active flow when synchronization stored the message before the webhook path executed.

## Changes verified

- Meta Conversations API inserts can invoke DM automations for newly received inbound messages.
- A first-time synchronization does not trigger old Inbox history; only very recent messages are eligible until the first successful sync is established.
- Webhook/sync races are deduplicated using `social_automation_events` keyed by channel + platform + external message ID.
- A live Instagram webhook can recover the automation path when the same Inbox message was already stored by synchronization.
- Exact keyword matching remains case-insensitive (`Hi`, `HI`, `hi`).
- Instagram quick replies remain the primary rich response. If Meta rejects the quick-reply format while ordinary Instagram DM sending still works, the automation falls back to a numbered text choice and preserves the flow session.
- X/Twitter polling uses the same new-message automation recovery behavior.
- Existing Facebook automation still triggers and records one run.

## Automated verification performed

1. Full JavaScript syntax validation: **271 JS files, 0 syntax errors**.
2. Relative ES module import validation: **302 relative imports, 0 missing imports**.
3. Admin index local JS/CSS/asset validation: **140 local references, 0 missing files**.
4. V16.65 migration execution against SQLite: **passed**; `social_automation_events` created with 10 columns.
5. Instagram sync-recovery integration test using a D1-compatible in-memory SQLite adapter:
   - new Instagram `Hi` message imported by Conversations sync;
   - active exact-keyword flow matched;
   - native Instagram quick-reply response sent;
   - one automation run recorded;
   - one event claim completed.
6. Webhook-after-sync race test for the same Instagram Meta message ID:
   - webhook processed after sync;
   - **no duplicate automation reply**;
   - **no duplicate automation run**.
7. Instagram webhook rich-message fallback test:
   - trigger `hI` matched saved exact keyword `hi`;
   - simulated Meta rejection of quick replies;
   - numbered fallback message sent;
   - automation choice session remained active.
8. First-sync history safety test:
   - one-hour-old Instagram message stored in Inbox;
   - **0 automation replies**, preventing historical messages from starting chatbots.
9. Facebook regression test:
   - `Hi` webhook matched the existing Facebook flow;
   - exactly one Facebook reply sent;
   - one run recorded.
10. Source comparison with uploaded V16.64:
   - **0 existing files removed**;
   - only `functions/_lib/social-dms.js`, `functions/_lib/social-automations.js`, and `README.md` changed;
   - V16.65 release note and migration added.

## Database compatibility

The new event-deduplication table is created automatically by the runtime through `ensureSocialAutomationSchema()`. The included migration is also safe to apply because it uses `CREATE TABLE/INDEX IF NOT EXISTS`.
