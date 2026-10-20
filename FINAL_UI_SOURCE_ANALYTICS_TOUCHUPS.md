# Final UI + Traffic Source Touch-ups

This revision is based on the immediately previous `urgent-casting-final-profile-dedupe-crm-payment-touchups` project and keeps its existing workflows intact.

## Included changes
- Dashboard/search/client page-activity badges now use fixed grid cells so badges line up in clean rows.
- Client `Time Spent` uses compact `HRS / MINS / SECS` labels and stays on one line.
- Admin modal dialogs can be closed with their Close button, by clicking the shaded backdrop, or with Escape.
- Contact and Submit Profile helper text is left-aligned under its own field.
- Public CTA renamed to `Submit Profile`; Submit Profile page badge renamed to `Profile Submission`.
- Dashboard `Top Source` card is clickable.
- New Traffic Sources modal provides Last 3 Days, Last 1/2/3 Weeks, Last 1/2/3 Months, and Custom Date Range filters.
- Traffic Sources grid is ranked from strongest to weakest source and shows Total Visits, Unique Visitors, Repeat Visitors, and selected period.
- Dashboard Top Source is now selected primarily by unique visitors, with total visits used as the tie-breaker.

## New endpoint
`GET /api/admin/traffic-sources`

Parameters:
- `preset=3d|7d|14d|21d|30d|60d|90d|custom`
- for `custom`, also provide `from=YYYY-MM-DD&to=YYYY-MM-DD`

Custom comparisons are limited to a maximum of 3 months.

## Database
No new D1 migration is required for this revision. It uses the existing `visitor_events` data.
