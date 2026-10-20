# V16.64 Release Verification

Base package: V16.63 complete replacement supplied by the user.

## Scope
- Social Media → Automations UI only.
- Automation definition/runtime additions required for WhatsApp Pay.
- No existing V16.63 file was removed.
- No unrelated theme, Inbox, Comments, Orders, Payments, CRM or publishing logic was intentionally changed.

## Verification results
- JavaScript files parsed with Node: 271
- JavaScript syntax errors: 0
- Relative module imports checked: 302
- Missing relative imports: 0
- Admin local JS/CSS/assets references checked: 142
- Missing Admin references: 0
- Targeted V16.64 assertions: 30/30 passed
- V16.63 files present in base: 557
- Files removed from base: 0

## Targeted checks
Verified that the active Admin page loads the V16.64 builder rather than V16.63; the instruction banner and run counters are absent; platform flow libraries use CSS Grid; New/Edit opens a fixed full-screen workspace; the board is focusable/pannable; Ctrl+wheel zoom, Ctrl+A/C/V, node header dragging and connection remapping are present; platform SVGs are recognizable; WhatsApp Pay is exposed only for WhatsApp DM flows; the backend accepts/sanitizes payment nodes; and the runtime emits WhatsApp `order_details` / `review_and_pay` with India `payment_type: upi` and `payment_configuration`.

## Deployment note
The WhatsApp Pay block requires the connected WhatsApp Business number to have a valid Meta Payments API payment configuration. `WhatsappPay` is the default configuration name because it matches the supplied workflow reference; change it in the block if the Meta configuration has another name.
