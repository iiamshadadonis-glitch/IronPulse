# Urgent Casting V14.6 — Stability, Plan UI & Theme Fix

This build is based on V14.5 and keeps the existing checkout, subscription, gateway, CRM, order, refund, invoice, statement, storage and admin logic intact. Changes are additive or narrowly scoped to the reported issues.

## Main fixes

- Existing D1 databases now auto-upgrade the V14.5 plan/trial columns. Client Details also has a backward-compatible fallback so an older D1 schema cannot expose `no such column: p.trial_enabled` to the admin.
- The Orders-page MutationObserver updates are idempotent, preventing repeated DOM rewrites that could freeze the browser.
- Plan/Offer SKU and slug are generated in the backend; they are no longer shown in Add/Edit Plan UI.
- One-Time Payment hides Billing Period and Trial controls.
- Enable Trial uses a toggle. Trial fields are Charge Today → Trial Unit → Trial Length, with a live explanation of when the current selling price starts.
- Offer Price has only the compact inline “Enable offer price” checkbox.
- Plans & Offers uses one compact next-step notice.
- Plan-type badges appear after the plan name.
- Only the cover image appears in the Plans & Offers grid; the image count still shows 1/3, 2/3 or 3/3.
- Invoice history uses fixed non-colliding columns with horizontal scrolling.
- Saved theme colors now propagate to primary public/admin brand surfaces including public badges, footer, admin sidebar, buttons and compatible add-on components.
- Yearly Plans is inside the Offers dropdown after Memberships and Festival Offers, not a separate top-level navigation item.

## Database safety

No manual SQL should be required for an existing deployment. The Pages Functions middleware runs `ensureSchema()` for `/api/` calls; V14.6 bumps the schema-ready version and adds the missing plan/trial/order columns using additive `ALTER TABLE` statements wrapped for repeat-safe execution.

The original `0014_plan_billing_trial_yearly.sql` migration is also retained for normal Wrangler migration workflows.

## Validation performed

- JavaScript syntax: all project JS files passed `node --check`.
- TypeScript semantic scan of JS: no syntax or const-reassignment diagnostics.
- CSS parsing: all CSS files parsed without errors.
- D1 migration smoke test: migrations 0001 through 0014 applied successfully to a clean SQLite database.
- Existing-D1 upgrade smoke test: a database through migration 0013 successfully received the V14.5/V14.6 plan/trial columns additively.
- Static local HTML asset references and relative JavaScript imports were checked for missing files.
