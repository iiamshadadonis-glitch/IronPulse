# V16.77 — Client Social Identities and Sticky Modal Layouts

## Client Details

- Summary and Profile now show a social-media identity only when the lead actually has that platform ID from a form, inbound social conversation, or confirmed admin update.
- Supported identities are Facebook, Instagram, Threads, Snapchat, LinkedIn, X / Twitter, Pinterest, YouTube, TikTok and Telegram.
- Public handles and submitted public profile URLs open the matching profile in a new tab. Provider-only numeric IDs remain visible but are not converted into a fake public URL.
- Edit Client can confirm or update the same platform identities. Blank platform identities remain hidden in Summary/Profile.
- Download Details includes the known social identities and profile links.

## Lead matching

- Existing phone, email, visitor/device and Instagram matching remains in place.
- The existing `lead_field_candidates` store now accepts the other platform identifiers, so a handle submitted in a form can be matched to the first inbound DM and vice versa.
- If a social automation later captures a phone or email already owned by another lead, the established lead remains canonical, the platform identity link moves to it, and the temporary social-only lead is resolved as merged.
- No new D1 table, column or migration is introduced by V16.77.

## Client modal scrolling

- Client Details title remains fixed.
- Client overview and Summary/Profile/History/Payments/Refunds/Invoice tabs remain fixed.
- Only the active tab content scrolls.
- Edit Client, Add Follow-up, Generate Payment, Add Payment, Download Details and Delete Client remain in a fixed footer row.
- Invoice is inserted inside the tab scroller, so its Payment/Refund selector and Generate Invoice button are not covered by the footer.
- Refunds is inserted inside the tab scroller, so Refresh and refund controls are not covered by the footer.

## Dashboard modal scrolling

- Total Leads and the other dashboard client-list modals keep the title, Close button and top pager fixed while client cards scroll.
- Visitors and Repeat Visitors keep the title, Close button and table column headings fixed while rows scroll.
- Total Subscriptions keeps its title, description, filters, status and ledger headings fixed while subscription rows scroll.

## D1 observation baseline

The user-reported value immediately before deploying V16.76 was recorded as:

- Rows read: **860.6K**
- Rows written: **1.73K**

V16.77 deliberately does not change the V16.76 D1 read guard, middleware or migration. Compare the next Cloudflare reading against this baseline after V16.76/V16.77 has been live for the agreed observation period.

## Deployment

Deploy this directory as the complete replacement. Apply the existing V16.76 migration only if it was not already applied. V16.77 has no new migration.
