# V16.76 Release Verification

Verification date: 2026-09-04 (UTC)

## Automated verification

- `node tests/v16-76-smoke.mjs`: passed.
- Every JavaScript file under `functions/` and `public/`: `node --check` passed.
- Every Cloudflare Function module: bundled successfully with esbuild 0.28.1 (169 of 169 source modules).
- Migration `0036_v16_76_d1_read_guard.sql`: applied successfully to an isolated SQLite database with representative production base tables; the budget table and all three new indexes were verified.
- D1 circuit-breaker transitions: standard work accepted below 750k, scheduled work refused at the soft boundary, critical event work permitted only inside its reserve, and hard-pause state set before exceeding the configured hard boundary.
- Lead Nurturing SQL smoke: enabled flow saved, eligible lead enrolled, one due step processed, and saved flow listed successfully without any external provider call.
- Static UI contracts: Text/Image/Video/Carousel poll controls, four Poll launcher modes, exact Article poll anchor, four ordered Automation modes, Comment-to-DM visual mode and Lead Nurturing visual workspace references all verified.
- Release archive: verified separately after packaging with `unzip -t`, file-count comparison and SHA-256 generation.

## D1 correction checks

- `functions/_middleware.js` no longer imports or invokes `processLeadNurture`; normal public page views cannot scan `contact_leads` for nurturing.
- `hasPurchased()` no longer loads/scans 500 orders. It performs an indexed email/phone identity query and returns at the first confirmed purchase.
- General enrollment is bounded to the latest 100 eligible leads; exact captured-lead enrollment uses one lead.
- The protected scheduler reserves conservative read estimates before due-batch work.
- Default background thresholds are 750,000 soft and 1,250,000 hard, leaving at least 750,000 rows of design headroom below the 2,000,000 overall target.

## UI checks

- Article Add Poll Optional is inserted directly after Schedule this post and before Save Draft / Post Article / Clear.
- Article help receives poll instructions and extra card padding/list spacing.
- Text, Image, Video and all three Carousel forms render Add Poll Optional as part of the composer.
- Poll state survives media/composer rerenders.
- The separate Polls tab offers Text Poll, Image Poll, Carousel Poll and Video Poll.
- Automation tabs appear in the requested order: Chatbot DM, Chatbot Comments, Lead Nurturing, Comment Triggers DM.
- Comment Triggers DM uses the existing dotted visual flow builder and the `comment_dm` backend channel.
- Lead Nurturing has a dotted ordered-channel board, source/purchase/repeat rules, and a Flow Name / Trigger / Status / Enable / Actions grid.
- Existing Quick Replies, Interactive Buttons and Image + Interactive Buttons remain unchanged.

## Preservation checks

- No existing color values or theme variables were modified.
- Existing DM/Comment flow persistence, payment logic, media storage logic and unrelated application behavior remain in place.
- The V16.75 provider-hosted Inbox document behavior is retained.
