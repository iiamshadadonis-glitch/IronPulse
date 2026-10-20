# V16.1 — Payment Recovery, Authenticated Subscribers & GST Checkout Fix

This release is intentionally additive on top of V16.0.

## Payment creation recovery

V16.0 added `tax_snapshot_json` fields to orders/order items but accidentally left the runtime `SCHEMA_VERSION` marker at the V15.9 value. Existing D1 databases therefore considered the schema already complete and skipped the new ALTER statements. Payment creation then referenced columns that were not present, which could surface as a generic `Request failed` from public checkout and admin custom payment/subscription creation.

V16.1 bumps the runtime schema version and adds guarded self-healing ALTER statements. No manual D1 SQL is required in the normal Pages deployment flow.

## GST/order-summary refresh

Checkout tax rendering now reads the fresh `/api/public/checkout-settings` response directly. The endpoint is also `no-store`, so newly saved tax settings can be reflected immediately instead of depending on previously loaded public-site settings.

## Authenticated subscribers

Customers whose subscription is `authenticated`/authorised/trialing are now retained in Customers → Subscribers as `Authenticated`. They are not treated as paid recurring subscribers; they simply remain visible in the active subscriber list while the next charge is pending. Failed/cancelled/expired states continue to move to the inactive list.

## Solution-oriented payment errors

Public checkout and admin payment-link/QR/subscription creation now replace a bare `Request failed` with an action-oriented message telling the user/admin what to try next and where to check payment-gateway configuration.

## Scope

No color theme, payment-gateway priority, trial accounting, invoice receipt logic, Subscription Overview cache logic, Auditions logic, or unrelated CRM behavior was redesigned in this release.
