# V16.66 Release Verification

Verification was run against the completed V16.66 working package and repeated against the final ZIP extraction.

## Functional checks

- Instautomate inbound WhatsApp `Hi` with `is_new_message=true` triggers an enabled Urgent Casting WhatsApp DM flow.
- Flow Builder `Buttons / Quick Replies` sends through Instautomate `/contact/send-interactive-message` rather than requiring direct WhatsApp Cloud API credentials.
- Instautomate interactive body uses the connected phone number, `interactive_type=button`, and provider button map.
- A second copy of the same `whatsapp_message_id` creates no second inbound row and no second automation send.
- An Instautomate `is_new_message=false` + `status=sent` callback creates no Inbox bubble and triggers no automation.
- A forwarded original `whatsapp_webhook_payload.entry[].changes[].value.messages[]` event is stored once and the normalized wrapper is not stored again.
- Numeric provider button reply ID `1` follows the first connected Flow Builder choice and sends the next connected node.
- Legacy blank Instautomate status rows are removed by startup repair without deleting genuine messages.
- Lightweight Instagram realtime check imports a new recent DM and executes the matching automation in the same check.
- Instagram core webhook subscription test confirms `messages` and `comments` even when an optional event field is rejected.

## Package checks

- All JavaScript files pass `node --check`.
- All relative JavaScript imports resolve.
- All local Admin `src` / `href` references in `public/admin/index.html` exist.
- No existing V16.65 file was removed.
- Final ZIP integrity is tested with `unzip -t`.
