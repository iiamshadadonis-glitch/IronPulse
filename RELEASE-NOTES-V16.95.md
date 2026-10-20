# V16.95 — Heat-map viewing, guidance and reminder polish

## Changes

- Heat-map previews now preserve the selected device width internally and scale it to the available card width. Horizontal scrolling is disabled; the complete page can be inspected by scrolling vertically.
- The preview measures same-origin page height after loading and recalculates on resize so overlays remain aligned with the page.
- The legacy heat-map loader now exits when the upgraded renderer owns the panel and checks the preview frame before setting its source. This removes the `Cannot set properties of null (setting 'src')` error.
- Heat Map, Scroll Map and Attention Map guidance now contains titled explanations, diagnostic signals, examples, actions and official learning links.
- Marketing Analytics guidance now explains ROAS, CPC, CPM, CPA and CAC with formulas, diagnostic steps, examples, official links and an explicit educational-risk warning.
- Webinar reminder rows now align time, unit, channel buttons and Remove. Selected channels toggle directly on the buttons and are no longer duplicated beneath them.
- Scheduling validation now rejects enabled reminder plans with missing time/unit/channel selections before any event is created.
- Marketing and Webinar integration cards no longer render the duplicate status-side arrow. The existing themed dropdown arrow at the card edge remains.

## Deployment

This package is a complete replacement. It contains no new migration. Replace the deployed project with this package and deploy normally; there is no separate D1 migration command for V16.95.
