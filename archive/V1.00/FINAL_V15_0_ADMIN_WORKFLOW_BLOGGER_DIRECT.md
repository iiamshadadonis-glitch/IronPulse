# Urgent Casting V15.0 — Admin Workflow + Direct Blogger Publishing

Base: V14.9 complete replacement. Existing theme CSS and the V14.9 payment/subscription logic are retained.

## Admin workflow additions

- New Subscription: Subscription Amount and Subscription Start Date are aligned together; Advance / Setup / Trial Amount Charged Today is renamed and positioned below them.
- New Subscription help explains the difference between the recurring subscription amount, start date, and the amount collected today, including a simple example.
- Generate Payment: standard and customized subscription forms use the new Advance / Setup / Trial label and improved field placement.
- Orders: new-order workflow uses a compact custom action selector with Save beneath it. Existing status logic is retained; Cancellation and Failed are available as additional workflow choices.
- Enquiries: contact-form submissions now have an inquiry-level lifecycle (New / In Progress / Resolved) without changing the CRM lead-interest status. New contact enquiries default to In Progress. Resolved enquiries are excluded from All/In Progress and remain available under Resolved and Client Details history. Permanent inquiry deletion deletes the inquiry event, not the client record.
- Dashboard: Requests opens In Progress requests; Follow-ups Overview includes an Inquiries card that opens In Progress enquiries.
- Subscribers: a single-fetch/single-render loader prevents the prior double-render/twitch and keeps active and inactive tables separate.
- Visitors and Repeat Visitors dashboard cards open a visitor-journey modal sorted by latest visit, including visitor/lead, latest visit, visit count, unique/repeat type, multiple sources and pages. Matched leads are clickable; anonymous visitor IDs are not.

## Direct Blogger.com connection — no n8n required

- Settings → API Settings now contains a direct Google OAuth Blogger connection.
- Admin saves a Google OAuth Web application Client ID and Client Secret, copies the generated Authorized Redirect URI into Google Cloud, and clicks Connect Blogger.
- After consent, the website reads the blogs available to the connected Google/Blogger account and lets the admin choose the target blog.
- Website Content → Auditions can publish a Published audition directly to Blogger API v3. Drafts remain local until published.
- Existing locally stored Blogger post IDs are reused for updates so editing an already-published audition updates the same Blogger post rather than intentionally creating another one.
- n8n/automation endpoints remain available but are not required for direct Blogger publishing.

## Database compatibility

Schema changes are additive and handled by the existing automatic `ensureSchema()` middleware. The included `0015_inquiry_status_blogger_posts.sql` migration documents the same additions for normal Wrangler migration workflows.

## Theme guarantee

The existing V14.9 theme CSS files were not edited for this release. New V15 CSS is layout-only and uses the existing theme variables rather than redefining primary/accent colors.
