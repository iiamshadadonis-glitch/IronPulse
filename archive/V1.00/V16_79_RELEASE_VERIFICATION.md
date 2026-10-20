# V16.79 Release Verification

## Automated checks

- `node tests/v16-79-smoke.mjs`
- `node tests/v16-78-smoke.mjs`
- `node tests/v16-77-smoke.mjs`
- `node tests/v16-76-smoke.mjs`
- JavaScript syntax checks for all changed browser, API and library modules.

## Manual acceptance checklist

1. Open Client Details and verify Most Visited Website Pages is visible with no expand/collapse arrow near Pending Amount.
2. Open Automations → Lead Nurturing → New Flow and add an Email/Gmail step.
3. Confirm the email content labels describe branded email formats and the preview is visible beside the editor.
4. Change Wait to 6 and Time Unit to Hours; verify the capsule reads **After 6 hours** immediately.
5. Type a badge, title, subject and message; verify the preview changes live.
6. Choose image or document content and upload a file; verify the file appears in Google Drive under **Lead Nurturing Automation Email** and only its link is retained by the flow.
7. Select link content and verify the preview shows a button label rather than a raw URL.
8. Select a plan/offer and verify the preview identifies it; delivery resolves current price and availability.
9. Save an incomplete flow while Active is off; verify it saves as a draft.
10. Turn Active on with required information missing; verify fields/cards are highlighted and activation is blocked.
11. Repeat activation checks from the flow-library switch for each automation type; verify the server blocks incomplete flows.

No new D1 migration is required for V16.79.
