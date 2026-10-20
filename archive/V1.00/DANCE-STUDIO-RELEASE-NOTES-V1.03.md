# DropBeat Dance Studio V1.03

V1.03 is a targeted presentation and interaction update on top of the complete V1.02 replacement. Existing authentication, database, payment, publishing, CRM, integration and automation logic remains unchanged.

## Admin presentation

- Brand Settings tabs now use rectangular Dropbeat controls, with the active tab shown only in Dropbeat indigo.
- Legacy feature variables now resolve to the Dropbeat indigo, mauve and neutral surface palette.
- CSS-grid headers, cells, wrappers and integration capability grids use clean white/grey Dropbeat surfaces instead of the inherited cream/maroon palette.
- Analytics → Calendar and Social Media → Posts → Scheduling now use Dropbeat calendar headers, cells, focus states and navigation controls.
- Article presentation is labeled **Dance Tips**, including **Post New Dance Tip**, **Load Dance Tips**, **Add Advertisements to These Dance Tips**, and **Existing Dance Tips**.

## Posts selection behavior

- Polls is selected only while the Poll launcher is visible.
- Selecting Text Post, Image, Carousel, Video, Story / Status or Scheduling clears Polls and every other tab.
- The same single-selection rule is re-applied after dynamic Posts workspace rebuilds and exposed through `aria-selected`.

## Frontend navigation

- The `/blog` menu and footer label is now **Dance Tips** on every static and dynamically generated page.
- The Dance Tips listing/detail titles and loading text were updated without changing the `/blog` route or article data model.
- Desktop menu spacing is uniform across Home, Offers, About, Dance Tips, Track Order, Contact and Admin Login.
- Offers keeps automatic hover/focus opening, has no arrow, and uses a high-contrast white Dropbeat submenu on the dark home header.

## Cache refresh

- Public theme, language and navigation helper URLs use `v=1.03` on every page and dynamic template.
- Admin final theme, language and behavior URLs use `v=1.03` and load after inherited assets.
- Critical Dropbeat public assets also send `no-cache, must-revalidate` so intermediaries revalidate them.

## Verification

Run the focused V1.03 checks and the complete inherited regression chain with:

```bash
npm run test:dance-v1.03
```
