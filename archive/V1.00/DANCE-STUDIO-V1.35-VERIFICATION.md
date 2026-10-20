# DropBeat Dance Studio V1.35 Verification

## Release scope

V1.35 adds the final dark-mode and phone presentation layer and corrects Attendance view state. No database migration was added. Authentication, checkout/payment creation, gateways, subscription rules, schema and established Student/Coach portal logic remain byte-identical to the supplied V1.34 package.

## Automated verification

Run:

```bash
npm install
npm run test:dance-v1.35
npm run test:dance
```

The V1.35 checks verify:

- unique V1.35 CSS/JS delivery on every static page, dynamic blog/custom page and middleware fallback;
- release headers and Admin release marker;
- JavaScript syntax and balanced stylesheet blocks;
- dark-mode selectors for every late-rendered Admin component reported in the screenshots;
- home heading recovery, mobile banner/Welcome/Session Details, plan image, class summary, Contact and checkout rules;
- independent Students/Coaches Attendance reloads and role-specific columns;
- hidden Calendar/List controls in Remuneration;
- exact hashes of protected login, payment, schema, core application and portal files.

## Manual smoke check after deployment

1. Confirm the response header reads `X-DropBeat-Release: 1.35.0`.
2. On Home in dark mode, confirm all section headings are visible on desktop and phone.
3. On a phone, open a plan and confirm the artwork is not stretched, the three class summary boxes appear, and View Details opens the complete information.
4. Open Admin → Webinars → Attendance. Switch Students ↔ Coaches and confirm the loading state runs and the columns/metrics change.
5. Select Remuneration and confirm Calendar/List is not shown.
6. Open the Admin pages shown in the supplied screenshots and confirm their cards, toggles, notices, tables, calendars and modal content remain readable in dark mode.

