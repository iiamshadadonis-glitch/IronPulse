# V16.88

- Reconciles paid recurring orders into Customers → Subscribers immediately, without writing or scanning 2,000 orders whenever the list opens.
- Keeps newer paid subscriptions visible even when the same phone has an older cancelled subscriber record.
- Counts only **New** inquiries and requests on parent/workspace badges; In Progress counts stay on their own tabs until resolved.
- Stores newly submitted service requests as New and moves them through the existing admin workflow.
- Adds an **Analytics** sidebar group with **Growth Analytics** and **Calendar**.
- Growth Analytics supports Business Results, Visitor Sources and Lead Generation; line, vertical bar, horizontal bar and pie charts; day, month, year and custom ranges; saved browser color choices; and themed help/back controls.
- Calendar supports calendar/list views, month and keyboard navigation, selected-day summaries, paid/failed/cancelled/refund capsules, detailed customer tables and Client Details links.
- Uses accurate labels: net received is confirmed receipts minus refunds; failed and cancelled values remain separate rather than being presented as accounting losses.
- Reduces D1 traffic from legacy admin polling, pauses refreshes on hidden pages, memoizes dashboard aggregates briefly, and adds focused indexes used by subscriber and analytics queries.
- Keeps Telegram webhook-driven; no Telegram polling loop is introduced.
- Creates no new database and does not change the established visual theme.
