# V16.89 release verification

The release gate verifies:

- the V16.89 core, UI, and CSS assets are loaded in the correct order;
- all five period options exist and weekly/monthly/yearly aggregation is real;
- empty periods are zero-filled from the selected start through end;
- every chart renderer creates hover hit regions and the tooltip includes business amounts;
- pie totals are outside the canvas center and slice counts are rendered;
- contextual Help & Instructions controls exist for all three analytics modes;
- Analytics remains load-on-demand and introduces no timer;
- public-page maintenance uses one 15-minute edge-cache lease rather than three D1 scans per page view;
- the historical Analytics API range remains bounded to ten years;
- the previous V16.88 data-integration suite continues to pass.

Run:

```bash
npm run test:v16.89
```

The final ZIP is also integrity-tested, extracted into a fresh temporary directory, and tested again from the extracted copy before delivery.
