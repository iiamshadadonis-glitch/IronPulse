# V16.91 release notes

## Business Ops notifications

- A zero or empty Orders & Leads count now removes the notification element completely.
- Only positive integer counts create a visible red notification capsule.
- Empty notification elements have a CSS fallback that forces them to remain hidden.
- The affected admin JavaScript and CSS references use the V16.91 cache key.

## Growth Analytics chart presentation

- Line, vertical-bar, horizontal-bar, and pie tooltips are positioned against the visible chart and browser viewport.
- When there is not enough room beneath the pointer, the tooltip opens above it.
- Tooltips no longer participate in the scrollable chart layout, preventing hover-created scrollbars.
- Pie charts reserve separate vertical space for the period heading, diagram, total, and next row.
- Narrow pie slices use outside value labels with leader lines.
- Multiple outside labels on the same side are spaced apart before drawing, preventing collisions.
- The same renderer is shared by Business Results, Visitor Sources, and Lead Generation for daily, weekly, monthly, yearly, and date-range views.

## D1 observation

- Recorded the supplied 7 September 2026, 11:24 IST checkpoint: 246.51K rows read, 79 rows written, and 935 queries.
- No D1 code, safeguard, cache duration, polling interval, schema, migration, or database topology was changed in this release.

## Compatibility

This is an additive presentation repair on top of V16.90. Existing business workflows, integrations, notification acknowledgement rules, chart aggregation, colors, and data APIs remain unchanged.
