# V15.8 — Orders, Auditions wording/help, and Subscription Overview cache polish

This update is intentionally narrow and keeps the existing theme, gateway selection, subscription grouping, CRM identity, Audition publishing/scheduling, enquiry, order and payment workflows intact.

## Orders

- Removed the older duplicate order-status control after the final themed selector is created.
- The existing themed selector and non-clipped floating option menu remain unchanged.
- The Save button now sits directly below the single selector with the existing spacing/padding.

## Auditions

- Removed internal implementation terminology from the Auditions interface.
- The summary helper now explains New, Published, Scheduled, Drafts, Deleted and All in admin-friendly language.
- Deleted rows display `Database Only` instead of internal database terminology.
- Delete/repost/purge confirmations use public website, SEO and database wording only.
- The Post New Audition Update information card now explains Featured Audition and Schedule this post, including what each option does and when to use it.
- Existing publish, schedule, delete, repost and database behavior is unchanged.

## Subscription Overview

- Preserves payment details already learned from a live gateway refresh when a later lightweight/card refresh does not request those fields again.
- Preserved fields include payment method, UPI ID, amount, previous bill date/amount, next charge/amount, paid cycles and other known subscription details.
- The same preservation is applied to activity-based views such as Successful Charges, Renewals, Failed Subscriptions and Cancelled Subscriptions.
- Fresh lifecycle/status information still wins, so a subscription that becomes cancelled or failed moves to the correct existing card while its known payment details remain available from the saved database record.
- Disabled gateways remain untouched by refresh logic, as before.
- Increased the Previous Bill / Next Charge / Next Amount column widths so values no longer overlap while retaining the single horizontal scrolling row.

No new D1 migration is required for V15.8 because it reuses the existing Subscription Overview cache tables.
