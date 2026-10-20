# V16.80 — Client disclosure, trial offers and automation attachments

This replacement release is additive to V16.79. Existing theme colors, D1 migrations and the V16.76 D1 read-budget safeguard are unchanged.

## Client Details

- The **Most Visited Website Pages** capsule starts collapsed.
- Clicking anywhere on its heading toggles the page chips; there is no floating arrow.
- The Client Details dialog uses a larger responsive desktop size while preserving the fixed header, contained tab scroller and fixed action footer.

## Lead nurturing offer emails

- The live preview and sent branded email show the same regular, offer and trial pricing state.
- An active trial strikes the regular and sale prices and highlights **Try for just ₹…**.
- A non-trial sale strikes only the regular price and highlights the offer price.
- Price and availability are resolved again immediately before sending.
- **View Offer** uses an expiring signed URL. It prepares the selected plan and known lead name, WhatsApp number, email, city and preferred role on Checkout.

The signed checkout URL uses `AUTOMATION_CHECKOUT_SECRET` when configured, with the existing payment/automation secrets as safe fallbacks. If no signing secret exists, the normal offer URL is used.

## Google Drive attachments

- Email steps accept up to ten image/document attachments.
- WhatsApp lead-nurturing steps and Comment Triggers DM media blocks accept one platform payload attachment.
- Upload state remains visible after completion or failure.
- Attached filenames are clickable and each has an × control to remove it from the flow.
- Files are uploaded to the configured Google Drive **Automation Attachments** folder. D1 stores only the Drive link and small metadata; file bytes are never stored in D1.

## Comment Triggers DM

- Facebook and Instagram flows allow public reply variations and delay blocks, followed by exactly one initial private-reply block.
- Activation marks every extra private block in red with a specific removal diagnostic.
- Runtime also stops after the first private reply, protecting previously saved flows.
- Further automated conversation belongs in Chatbot DM after the recipient replies.

## Verification

- `npm run test:v16.80`
- `npm run test:v16.79`
- `npm run test:v16.78`
- `npm run test:v16.77`
- `npm run test:v16.76`
- Every file in `functions/` passed `node --check`.
- Cloudflare Pages Functions compiled successfully with Wrangler.
