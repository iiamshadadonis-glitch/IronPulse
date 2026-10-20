# DropBeat Dance Studio V1.36

V1.36 is the complete replacement package based on the supplied V1.35 code. It adds a phone-only application layout for the Admin, Student and Coach dashboards. Desktop business logic, website colours, authentication, checkout, subscriptions, payments and D1 data remain unchanged.

## Included changes

- Dashboard metric groups now use horizontal snap carousels with live pagination dots on phones.
- Mobile dashboard dialogs now open as full-screen page sheets; short confirmation dialogs use bottom sheets with visible close/cancel controls.
- Semantic tables and supported CSS grids are converted to labelled stacked cards on phones while preserving their existing buttons and handlers.
- Large Admin, Student and Coach forms become chronological multi-step wizards with named steps, completed ticks, Back/Continue controls and native field validation.
- Dashboard calendars use a compact seven-column month grid with event/holiday indicators and a selected-date agenda beneath the month.
- Daily schedule rows and calendar details use vertical app cards on phones.
- Client result cards use a compact two-column layout so four records fit in a two-by-two mobile group.
- Repeating decorative blink/pulse effects on Admin data cards are disabled; loading spinners remain available.
- V1.36 uses new immutable asset URLs, no-store dashboard document delivery and `X-DropBeat-Release: 1.36.0` for immediate cache discovery.
- The enhancement runtime is finite and event driven. It uses no whole-page mutation observer, no polling interval and no network request.

## Windows deployment

1. Extract the complete ZIP into a new folder.
2. Double-click `DEPLOY-V1.36-WINDOWS.bat`.
3. Wait until all four steps report completion.
4. Open the normal website URL and refresh once.

## macOS or Linux deployment

```bash
chmod +x DEPLOY-V1.36-MAC-LINUX.sh
./DEPLOY-V1.36-MAC-LINUX.sh
```

The scripts stop safely if installation, verification, migration or deployment reports an error. They never reset or delete the database.
