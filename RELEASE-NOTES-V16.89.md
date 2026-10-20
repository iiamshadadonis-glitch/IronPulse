# V16.89

- Replaces Growth Analytics period choices with **Daily, Weekly, Monthly, Yearly, and Date Range**.
- Aggregates the same saved records into the selected period and inserts zero buckets between From and To, so missing days, weeks, months, and years remain visible as zero.
- Adds pointer hit-testing and themed hover tooltips to line, vertical bar, horizontal bar, and pie charts across Business Results, Visitor Sources, and Lead Generation.
- Business tooltips show period, count, and amount. Visitor and lead tooltips show their source, period, and saved count.
- Removes the pie center total, prints counts on non-empty slices, and places selected-period totals and per-series values in a clean section beneath the pie.
- Fixes the valid-data empty-state overlay so it cannot remain visible over a chart.
- Adds a themed Help & Instructions control for each analytics mode, dynamic saved-color guidance, descriptive hover titles, and the existing circular return control.
- Extends bounded analytics comparisons to ten years so a range such as 2019–2026 can be displayed without inventing records.
- Places public-traffic publishing fallback work behind one shared 15-minute edge-cache lease. Webhooks, protected automation endpoints, scheduled publishing behavior, manual refresh actions, and Telegram's webhook-driven inbox remain intact.
- Creates no database and adds no migration.
