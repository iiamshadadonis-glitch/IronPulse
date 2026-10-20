# V16.63 — Visual Social Automation Flow Builder

This release is an additive upgrade to V16.62. It keeps the existing admin theme, Inbox, Comments, integrations, posting, payment, customer and navigation logic intact while replacing only the simple Automation editor with a visual node-and-connection Flow Builder.

## What changed

### Visual canvas
- Flow Start card plus draggable automation blocks on a dotted canvas.
- Drag any block around the canvas and save its position.
- Drag from an output circle to another block's input circle to create a physical connection.
- Existing connections render as curved dashed lines.
- Auto Arrange and zoom controls are included.
- Delete/duplicate individual blocks without rebuilding the whole flow.

### Separate platform libraries
- Chatbot DM and Chatbot Comments remain separate.
- Under each, enabled platform tabs are loaded from the existing capability API.
- DM currently uses the already-supported Facebook, Instagram, WhatsApp and X/Twitter Inbox connections.
- Comment automation can be configured for reply-capable enabled comment platforms exposed by the existing integration settings, including Facebook, Instagram, Threads, YouTube, X/Twitter, LinkedIn and Google Maps Reviews when their reply capability is ready.
- Each platform has its own flow list and supports multiple independent chatbots/flows.

### Flow Start triggers
- Exact keyword
- Contains phrase
- Starts with
- Regular expression
- Any message/comment
- Multiple plain-text trigger words/phrases can be comma-separated.

### Blocks
- **Message** — text, image + message, buttons/quick replies, platform-aware list choices, and WhatsApp approved templates.
- **Question** — asks for free-text input and stores the answer in a named attribute.
- **Condition** — True/False branching using stored attributes, the latest message, time ranges or date ranges.
- **Set Attribute** — saves a reusable customer value for later blocks.
- **API Request** — GET/POST/PUT/PATCH/DELETE, custom headers/body, response capture, JSON path extraction, custom HTTP status branches and fallback branch.
- **Human Handoff** — ends the bot and leaves the conversation available in Inbox for an admin.
- **End Flow** — terminates the automation, optionally after a final message.

### Common conditions
Attribute/message conditions support:
- Equals / Not equal
- Contains / Does not contain
- Starts with / Does not start with
- Exists / Does not exist
- Greater than / Less than
- Regex matches

Time and date range conditions are also available. Time/date blocks include a timezone selector and default to `Asia/Kolkata` for this project.

### Question validation
Question blocks can validate:
- Text
- Email
- Phone
- Number
- Date
- Time
- Custom regex

The admin can configure 1–5 attempts, a friendly validation error message and a separate route after the attempts are exhausted.

### Attributes / variables
Built-in values include:
- `{{Name}}`
- `{{FirstName}}`
- `{{Username}}`
- `{{LastMessage}}`
- `{{Platform}}`

Any Question or Set Attribute block can create another reusable variable. Both `{{AttributeName}}` and `$AttributeName` are supported in message/API fields.

### API Request safety
- Only HTTPS endpoints are accepted.
- localhost/private/internal network targets are rejected.
- Automatic redirects are disabled so a public URL cannot silently redirect the worker to a private address.
- Requests time out after 8 seconds.
- API responses can be captured into an attribute and routed by exact status code or families such as `2xx`.

### Runtime behavior
- Button/list selections continue from the exact connected node.
- Questions create a temporary conversation session, validate the next customer response, save it, then continue along the connected path.
- Condition, Set Attribute and API Request blocks can execute automatically between visible customer messages.
- A traversal guard prevents accidental circular diagrams from running forever.
- Sessions expire after 24 hours.
- Existing V16.62 flow rows remain readable; stored V1 nodes are upgraded to the V2 visual structure when loaded/saved.

### Comment automation
- Facebook/Instagram continue to use the realtime comment webhook path.
- Other already-supported comment platforms can invoke an automation when synchronization imports a genuinely new/recent comment.
- Historical comments from an initial sync are not automatically replied to.

## Database
No manual D1 migration is required. The existing runtime schema initializer adds:
- `state_json` to `social_automation_sessions` when missing.
- `social_automation_attributes` for captured/set values.

Existing `social_automation_flows`, `social_automation_sessions`, and `social_automation_runs` are retained.

## Files changed from V16.62
- `functions/_lib/social-automations.js`
- `functions/_lib/social-dms.js`
- `functions/_lib/social-comments.js`
- `functions/api/admin/social-automations.js`
- `public/admin/index.html`

## Files added
- `public/admin/final-v16-63-visual-flow-builder.js`
- `public/admin/final-v16-63-visual-flow-builder.css`
- `FINAL_V16_63_VISUAL_SOCIAL_AUTOMATION_FLOW_BUILDER.md`
- `V16_63_RELEASE_VERIFICATION.md`

No V16.62 files were removed.
