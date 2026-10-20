# DropBeat Dance Studio V1.29 release notes

## Plans and first-open responsiveness

- Removes the delayed second rewrite that made the first Plans & Offers row blink.
- Renders the public plan link and class label in the initial table HTML.
- Shares in-flight Admin reads and keeps a bounded 45-second snapshot for Plans, Pages, Settings, Social Automations and Lead Nurturing.
- Prefetches those frequently used panels sequentially after the initial authenticated panel finishes, while respecting reduced-data connections.
- Delays loading messages briefly so a cached panel opens without a loading-message flash.
- Any Admin mutation invalidates the local read snapshot, and a generation guard prevents an older in-flight response from restoring stale data.

## Page-name consistency

- Public settings and navigation now share one authoritative `/api/public/site` request per document.
- Removes competing delayed navigation refreshes that could change Pricing back to Offers after page load.
- Settings and navigation saves synchronously clear the exact public Site/Bootstrap edge snapshots before reporting success.
- Renamed labels and slugs therefore remain consistent across the home page, renamed page and shared header/footer consumers after refresh.

## Website colours and frontend themes

- Replaces the Website Colors dropdown interaction with direct Website Colors and Theme sub-tabs.
- Propagates saved primary/accent colours to public chrome, footer, controls and dashboard navigation while keeping the original light palette unchanged by default.
- Adds three optional frontend-only layouts: Casting Editorial, Studio Spotlight and Modern Minimal, alongside DropBeat Original.
- Theme selection previews its recommended palette; the existing Save Settings action publishes the layout and colours together.
- Reset Theme restores DropBeat Original.
- Themes that do not use the studio image gallery hide those irrelevant banner controls and explain why; home-banner controls remain available.
- Student, Coach and Admin dashboard layouts are not replaced by a frontend theme choice.

## Dark mode

- Adds a last-loaded complementary dark surface/foreground system across public pages and Student/Coach portals.
- Repairs white inner wrappers, invisible headings, dark prices, plan fact panels, forms, tables, notices, menus, footers and authentication surfaces.
- Adds equivalent Admin dark overrides for cards, class details, plan mapping, workspaces, fields, tables and dialogs.
- All corrective selectors are dark-mode scoped; the established light-mode presentation remains unchanged.

## Preserved behavior

- Payment-link creation, first-payment-only coupons, login recovery, schedules, remuneration, database schema and migrations are unchanged from V1.28.
- Existing settings and records remain authoritative. No table, row, plan, order, coupon, user, image or saved colour is deleted or reset.
