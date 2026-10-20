# DropBeat Dance Studio V1.37

V1.37 is the complete replacement package based on the supplied V1.36 code. It adds the requested phone-only native application refinements to the Admin, Student and Coach dashboards. Desktop layouts, authentication, checkout, payment gateways, database behavior, saved brand colors and existing business rules remain unchanged.

## What changed

- Metric areas show two complete cards at once. Groups with six or more cards use exactly two evenly flowed carousel rows; smaller groups use one row. Pagination is page-based.
- Create Subscription and large mobile forms use full-screen pages with real step ownership, validation, Back/Continue controls and a final existing submit action.
- Selects, dates, times and existing multi-choice groups open compact bottom sheets while keeping their original form controls and handlers.
- Large mobile navigation groups use primary actions plus More/Filter sheets, and search fields expand from one search icon.
- Client Details is an edge-to-edge mobile workspace with compact stats, concise navigation/actions, two-column summary/profile data, timeline history and expandable payment rows.
- Mobile calendars show borderless dates with selected-date circles, class/holiday dots, agenda details and a scheduling action button.
- Growth Analytics and Marketing Analytics use touch-friendly horizontal timelines, a fixed data readout, vertical controls, compact legends, date-labelled horizontal bars and a true 1:1 aggregate donut.
- New immutable V1.37 assets and no-store HTML delivery make the release visible after one normal refresh.

## Deploy on Windows

Double-click `DEPLOY-V1.37-WINDOWS.bat`.

## Deploy on macOS or Linux

```bash
chmod +x DEPLOY-V1.37-MAC-LINUX.sh
./DEPLOY-V1.37-MAC-LINUX.sh
```

The deployment scripts install dependencies, run the complete V1.37 and inherited V17.09 verification chain, apply the existing additive D1 migrations and deploy to `dance-class-at2`.

