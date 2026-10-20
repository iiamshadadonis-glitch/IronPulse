# V17.02 — visitor and customer detail recovery

- Customers: opening a reconciled recurring order through a synthetic subscriber ID now loads the underlying order and the existing client details.
- Visitors and Repeat Visitors: collect the visitor journey in one aggregate, then attach the latest nonempty device, IP and location data from indexed event IDs. The visit counts, source and page lists, lead links and download format remain the same.
- An older database that lacks optional visitor fields can still return its saved journeys while the automatic schema setup adds those fields.
- A failed list query now returns a real error instead of HTTP 200 with zero visitors. The browser shows that error and does not download a misleading blank spreadsheet.
- Tracking keeps recent journeys visible if the separate totals calculation is unavailable; it labels those totals unavailable rather than displaying false zeros.
- Changed admin scripts and visitor URLs use V17.02 cache versions. Existing V17.01 D1 read controls stay in place.

No new D1 migration is required. This release does not delete or rewrite any visitor or customer records.
