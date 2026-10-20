# V16.64 — Automation Workspace & WhatsApp Pay

V16.64 is an additive update on V16.63 focused only on Social Media → Automations and the automation runtime.

## Admin Flow Library
- Removed the yellow Visual Flow Builder instruction banner.
- Removed the enabled/runs summary counters from the builder page.
- Uses the same recognizable Facebook, Instagram, WhatsApp and X-style platform marks used by the Inbox experience.
- Each platform opens a flow library with CSS-grid columns: Flow Name, Trigger, Status, Enable, Actions.
- Multiple flows are supported per platform. Existing flows can be enabled/disabled, edited or deleted.
- New Flow opens the visual editor in a full-screen workspace.

## Full-screen Visual Workspace
- Large dotted 4200 × 3000 flow board.
- Drag node headers to reposition blocks.
- Drag empty dotted board space to pan in every direction.
- Ctrl + mouse wheel zooms only the board.
- Ctrl+A selects all blocks, Ctrl+C copies, Ctrl+V pastes with new block IDs and remapped internal connections.
- Individual blocks can be Ctrl/Cmd-click selected, duplicated or deleted.
- Blocks can be clicked or dragged from the left palette.
- Existing connection ports, Auto Arrange and +/- zoom remain available.

## WhatsApp Pay block
- WhatsApp DM flows expose a dedicated WhatsApp Pay block.
- It creates the WhatsApp Cloud API interactive `order_details` / `review_and_pay` message.
- The block accepts item name, retailer ID, amount, tax, optional header image, footer and WhatsApp payment configuration name.
- Runtime uses current India Payments API fields `payment_type: upi` and `payment_configuration`.
- The default payment configuration name is `WhatsappPay`, matching the reference workflow supplied for this release. It remains editable because the actual Meta payment-configuration name belongs to the connected WhatsApp Business account.
- Native in-chat Pay is intentionally not exposed on Facebook, Instagram, X, or comment flows where the same WhatsApp Payments API is not available.

## Compatibility
- Existing V16.63 flow definitions remain readable.
- Existing Inbox, Comments, social publishing, payments, orders, CRM and site theme logic is retained.
- No existing file was deleted from the V16.63 replacement package.
