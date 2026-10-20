# V16.90

- Horizontal bars now transpose the same period buckets and series used by vertical bars. Daily, weekly, monthly, yearly, and date-range comparisons therefore preserve their exact periods and zero buckets.
- Horizontal-bar tooltips identify the exact bucket and selected series, including the correct count and saved amount for Business Results.
- Pie charts now show a separate pie for each period bucket. Empty periods remain visible as `No activity`, slice counts are printed on the pie, and tooltips identify the exact day, week, month, year, or selected range.
- Long horizontal and pie comparisons use period paging rather than combining or silently omitting buckets.
- Business pie details separate confirmed/net received, failed or cancelled value, and refunds. The misleading combined value has been removed.
- The mode-specific themed information control now sits inside the active analytics mode strip with proper spacing. It opens the instructions for the currently selected mode.
- Business Ops and Orders & Leads notification badges never display zero.
- Dashboard lead, hot lead, recent lead, and follow-up metrics now derive from one eligibility scan instead of repeating the paid-order identity match seven times.
- Identical authenticated Dashboard summaries share a 120-second edge cache, while the existing module cache and explicit business behavior remain intact.
- Request badge refreshes use a count-only response and a full Request workspace load returns its result to older decorators, preventing duplicate full-list queries.
- No database, color theme, payment rule, notification rule, Telegram polling loop, or database topology was added.
