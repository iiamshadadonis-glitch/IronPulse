# V16.78 release verification

## Verified scope

- Comment Triggers DM lists only connected, enabled integrations that support a
  comment-originated private reply.
- Public Comment Reply blocks rotate one to ten saved variations using an
  atomic cursor.
- Delay blocks accept only 5, 10, 15, 20, 25 or 30 seconds.
- The one permitted initial private reply supports text, image, remote document
  URL, normal link, quick replies, interactive buttons, image plus buttons and
  live plan/offer data.
- Live plan/offer delivery resolves the current price and sold quantity before
  building the message.
- Every saved freeform wire and every connected lead-timeline wire exposes a
  midpoint disconnect control.
- Lead Nurturing uses connected source choices, capsule controls, a visible Save
  Flow action, rich WhatsApp/email/SMS steps, purchase stopping, repeat timing
  and connection-aware completion.
- New inbound identity data can enrich an existing lead and move a duplicate
  platform identity to its canonical lead.
- Remote PDF/document bytes are not copied into the application database or
  media storage.

## Commands and results

```text
node --check (all changed JavaScript modules)   PASS
npm run test:v16.78                            PASS
npm run test:v16.77                            PASS
npm run test:v16.76                            PASS
0037 migration + atomic cursor SQLite check    PASS
```

The V16.78 migration was executed against an isolated in-memory SQLite database.
No production database was contacted or changed during verification.

## Deployment requirement

Apply `migrations/0037_v16_78_comment_dm_lead_timeline.sql` with the normal
deployment migration process. It creates only the small deterministic reply
rotation table; rich content remains in existing JSON flow definitions.
