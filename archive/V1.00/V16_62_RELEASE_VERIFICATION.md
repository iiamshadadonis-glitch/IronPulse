# V16.62 Release Verification

## Scope

V16.62 is an additive update based directly on the supplied V16.61 replacement package. It addresses the reported Inbox unread indicator, delayed Inbox icons, invalid Facebook Messenger profile links, legacy navigation reappearing after login/refresh, WhatsApp icon presentation, and adds Social Media → Automations with a capability-aware Flow Builder.

The existing color theme and unrelated business/payment/post logic were not redesigned.

## Verified corrections

- The Social Media → Inbox badge displays the unread **number** and is truly hidden at zero. The V16.61 CSS specificity rule that could show an empty red circle has been corrected.
- Instagram, WhatsApp and attachment/paperclip icons are rendered by the base Inbox renderer immediately rather than waiting for the delayed V16.59 enhancement pass.
- The modified base Inbox renderer is cache-busted to `v=16.62` in the admin entry page.
- Facebook Messenger Page-scoped participant IDs are no longer converted into fake `facebook.com/<id>` profile URLs. Existing manufactured URLs are scrubbed during Inbox schema initialization. Instagram profile links remain unchanged.
- Both older navigation builders are aligned with the current structure so `Sales Setup`, `Leads & Orders` and `Website Content` cannot be rebuilt after logout/login or delayed initialization.
- The authoritative V16.62 navigation contains Dashboard, Search, Sales, Orders & Leads, Customers, Social Media and Settings, with Automations directly below Comments.
- The V16.62 navigation observer watches only direct sidebar-structure changes, avoiding unnecessary full-sidebar rebuilds when a notification badge number changes.
- WhatsApp uses an immediate recognizable phone/chat icon instead of `WA`.
- A new admin-only `/api/admin/social-automations` endpoint and D1-backed automation engine are present.
- DM Flow Builder supports exact/contains/starts-with/any triggers; text, images, quick-reply buttons, lists and WhatsApp templates; linked follow-up steps; session continuation; and clean session-ending choices.
- Meta DM, WhatsApp webhook and X DM ingest paths invoke the automation matcher only after a genuinely new inbound message is stored.
- Facebook/Instagram new-comment webhooks can invoke plain-text Comment flows. Other comment platforms are not falsely exposed as realtime comment automation targets in this release.
- WhatsApp Cloud interactive button/list reply IDs are recognized for flow continuation.
- X/text fallback flows accept either the choice label or its displayed number (1, 2, 3, …).
- Approved WhatsApp template steps are restricted to WhatsApp flows and require a template name.
- Existing Inbox duplicate-message protection, read state and browser push notification logic remain intact.

## Automated verification performed

1. **JavaScript syntax:** 269 first-party `.js` files parsed with `node --check`; 0 syntax errors.
2. **Relative ESM imports:** 302 relative module imports detected and resolved; 0 missing targets.
3. **Admin local assets:** 140 local `/admin` and `/assets` `src`/`href` references in `public/admin/index.html` resolved; 0 missing files.
4. **Targeted source assertions:** 35 V16.62 assertions passed, covering numeric/hidden Inbox badges, first-render icons, cache busting, current navigation, absence of retired menu builders, Facebook PSID-link handling, Automation UI/API, trigger/step types, Meta/WhatsApp/X automation hooks, flow end handling, and navigation observer behavior.
5. **Automation D1 functional harness:** an in-memory SQLite/D1-compatible harness created the V16.62 automation schema, saved/listed/deleted flows, matched exact and contains triggers, advanced a button-linked session, ended a flow through a terminal choice, forced Comment flows to one text step, rejected unsupported comment platforms, rejected WhatsApp templates on non-WhatsApp flows, and rejected a template without a name. Result: PASS.
6. **Facebook Inbox functional harness:** an inbound Messenger webhook using a Page-scoped sender ID was sent through the actual `ingestMetaDmWebhook` function with a mocked Page user-profile response. The customer name/avatar were enriched, no fake Facebook public profile URL was stored, duplicate delivery of the same `mid` was ignored, one unread message remained, and one stored message was present. Result: PASS.
7. **Credential safety scan:** no `IGAA...` or `EAAX...` Meta access-token patterns from the earlier n8n workflow exports were found in the replacement package.
8. **Source-package comparison:** V16.62 is based on V16.61; no supplied V16.61 files are intentionally removed. The changes are confined to the Inbox/Comments/navigation files plus the new Automation module/UI and V16.62 documentation.
9. **ZIP integrity:** the delivered ZIP is tested with a full archive integrity pass before delivery.

## Deployment boundary

These tests validate the replacement package, D1-compatible logic, JavaScript/module integrity and local routing behavior. They do not claim that the package has already been deployed to the live Cloudflare Pages project. Live Facebook/Instagram/WhatsApp/X delivery continues to depend on the user's connected production APIs, tokens, permissions and webhooks.
