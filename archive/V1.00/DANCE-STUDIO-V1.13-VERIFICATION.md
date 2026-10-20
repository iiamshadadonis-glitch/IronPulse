# DropBeat Dance Studio V1.13 Verification

Verification was run against the complete replacement package, starting from the exact V1.12 attachment.

## Automated verification

Command:

```text
npm run test:dance-v1.13
```

Result: passed.

The full inherited chain passed through DropBeat V1.02–V1.12 and base application V16.88–V17.09. It includes deployment/static-route checks, all 47 D1 migrations, payments, subscriptions, class access, coach availability, coach replacement, reminders, calendars, analytics, marketing, visitor tracking, email, OTP and admin workflows.

## New V1.13 regression coverage

- Executes the exact branding routine that previously produced `old is not defined`.
- Confirms branding errors are isolated from public data rendering.
- Uses a migrated SQLite/D1-compatible fixture to verify one response contains a Brand Settings banner, Sales plan, active Student Story and WhatsApp settings.
- Verifies the Offers response contains the current active plan.
- Verifies About returns all saved paragraphs.
- Verifies FAQ returns both the saved page introduction and active FAQ item.
- Verifies every public HTML entry point uses the V1.13 browser cache identifier.
- Verifies Cloudflare public response-cache keys use V1.13.
- Verifies the public page and product events keep optional enhancements safe when scripts load in parallel.

## Release packaging checks

The release ZIP is tested with `unzip -t`, extracted into a new clean directory, and the complete `npm run test:dance-v1.13` command is run again from that clean extraction before delivery.

