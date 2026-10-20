# DropBeat Dance Studio V1.36 Verification

## Release scope

V1.36 is an additive responsive-presentation release. Its JavaScript augments existing elements and never calls an API, writes browser storage, renames form fields or replaces submit handlers. Phone rules are scoped to a maximum width of 760px. The only desktop change removes decorative blinking/pulsing from Admin data surfaces.

## Automated verification

Run:

```bash
npm install
npm run test:dance-v1.36
npm run test:dance
```

The V1.36 checks verify:

- unique cache-busted V1.36 delivery to Admin and both role dashboards;
- middleware fallback and `X-DropBeat-Release: 1.36.0` headers;
- balanced CSS, valid JavaScript and phone-scoped structural rules;
- carousels and pagination dots, page/bottom sheets, stacked labelled tables/grids, form wizards and compact calendar agendas;
- finite event-driven enhancement with no `MutationObserver`, `setInterval`, API call or storage write;
- exact hashes of the supplied login, payment, schema, core Admin and established role-dashboard logic.

## Manual phone smoke check after deployment

1. Open Admin Dashboard at 360–430px width and swipe each metric carousel; confirm its active dot follows the card.
2. Open a data dialog and a short confirmation dialog; confirm the first is a full page sheet and the second is a bottom sheet.
3. Open a table/list and confirm every desktop row is a labelled stacked card.
4. Open Create Subscription and Add Coach; use Back/Continue and confirm the original Save action is available on the final step.
5. Open Webinars and Analytics calendars; confirm event dates use dots/underlines and the selected date details appear underneath.
6. Open Student and Coach dashboards and repeat the card, form, table and dialog checks.
7. At desktop width, confirm the established layouts remain unchanged and data cards no longer blink.
