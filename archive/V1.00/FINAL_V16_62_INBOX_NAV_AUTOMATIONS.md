# V16.62 — Inbox Badges, First-Paint Icons, Stable Navigation and Automation Flow Builder

V16.62 is an additive update based on the supplied V16.61 replacement package. It keeps the existing admin color theme and existing payment, post, comment and Inbox workflows, while correcting the reported Inbox/navigation presentation issues and adding a capability-aware social automation builder.

## Inbox notification badge

- The Social Media → Inbox badge now uses the same numeric notification style as Comments.
- `1` means one unread Inbox message, `2` means two unread messages, and so on (capped visually at `99+`).
- A zero unread count is genuinely hidden. V16.61 had a CSS specificity conflict that could force the empty badge to remain visible as a red dot; V16.62 corrects that rule and adds a second defensive hidden rule.
- Existing per-platform unread counts inside Inbox remain available and are cleared by the existing mark-read behavior when the conversation is opened.

## Correct Inbox icons on first render

The original V16.56 Inbox renderer still contained temporary text/glyph placeholders. V16.59 later replaced them after its delayed enhancement ran, which explains why the old Instagram/attachment symbols could be visible first and then change later.

V16.62 moves the final icons into the base Inbox renderer itself:

- Instagram uses the camera-style SVG immediately.
- WhatsApp uses a recognizable WhatsApp-style phone/chat SVG immediately instead of `WA`.
- The attachment action uses the paperclip SVG immediately instead of the old placeholder glyph.
- The modified base renderer is cache-busted to `v=16.62` in `public/admin/index.html` so an older browser-cached script is not preferred.

## Facebook View Profile behavior

Facebook Messenger sends a Page-scoped participant identifier to the Page. That identifier is useful for Messenger replies but is not a guaranteed public Facebook profile URL. The previous implementation manufactured `facebook.com/<participant-id>`, which can open Facebook's “This content isn't available” page.

V16.62 therefore:

- stops manufacturing a Facebook public-profile URL from the Messenger participant ID;
- removes already-stored manufactured Facebook URLs when the Inbox schema initializes;
- keeps Instagram View Profile unchanged because Instagram supplies a usable username/profile URL;
- shows View Profile only when a real profile URL is actually available in the stored conversation.

This avoids sending the admin to a knowingly broken Facebook page while preserving the existing Messenger reply capability.

## Stable current admin navigation

The old `final-admin-homepage-polish.js` still contained the retired menu labels `Sales Setup`, `Leads & Orders` and `Website Content`. On login/re-login, that legacy builder could temporarily rebuild the old navigation before later scripts restored the current one.

V16.62 introduces an authoritative navigation normalizer and also aligns the legacy builder with the current menu so the retired structure cannot return.

Current visible navigation:

- Dashboard
- Search
- Sales
- Orders & Leads
- Customers
- Social Media
- Settings

Social Media contains:

- Article
- Posts
- Inbox
- Comments
- Automations

The existing underlying panels/functions are reused; retired/unmapped navigation buttons are simply not reinserted into the visible sidebar.

## Social Media → Automations

A new `Automations` option is added directly below Comments.

The Automations screen contains a **Flow Builder** with two modes:

### Chatbot DM

Capability-aware DM flows can be created for currently supported messaging connectors:

- Facebook Messenger
- Instagram Messaging
- WhatsApp
- X / Twitter when its DM read/write connection is available
- `All supported` can be selected for portable text/button-style flows

Each flow supports:

- Exact keyword trigger
- Contains trigger
- Starts-with trigger
- Any-message trigger
- Enable/disable control
- Text response
- Image + message
- Interactive buttons / quick replies
- List-style choices
- WhatsApp approved template response
- Multiple connected follow-up steps

Button/list choices use an internal flow session, so a customer's next button selection can advance to the linked step. Sessions expire after 24 hours.

Platform-specific delivery is capability-aware:

- Facebook/Instagram interactive choices use the connected Meta messaging endpoint.
- WhatsApp Cloud API can use native interactive buttons/lists and approved templates.
- X uses a text/numbered fallback where native button behavior is not available through the current connector.
- Existing Inbox sending and message storage are reused so automation replies remain part of the conversation history.

### Chatbot Comments

For this release, realtime comment auto-replies are enabled only for the two comment webhook routes already proven in this project:

- Facebook
- Instagram

Comment flows use a single plain-text automatic reply to avoid claiming unsupported rich-comment controls. Existing Comments moderation/status logic remains unchanged.

## Storage

The automation module creates its D1 tables on first use:

- `social_automation_flows`
- `social_automation_sessions`
- `social_automation_runs`

No separate migration step is required. Existing D1 Inbox and Comments tables are preserved.

## Files added

- `functions/_lib/social-automations.js`
- `functions/api/admin/social-automations.js`
- `public/admin/final-v16-62-inbox-nav-automations.js`
- `public/admin/final-v16-62-inbox-nav-automations.css`
- `FINAL_V16_62_INBOX_NAV_AUTOMATIONS.md`
- `V16_62_RELEASE_VERIFICATION.md`

## Existing files minimally updated

- `functions/_lib/social-dms.js`
- `functions/_lib/social-comments.js`
- `public/admin/final-v16-56-posts-carousel-dms.js`
- `public/admin/final-v16-61-inbox-routing-notifications.css`
- `public/admin/final-admin-homepage-polish.js`
- `public/admin/index.html`

