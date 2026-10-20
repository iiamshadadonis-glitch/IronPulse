# DropBeat Dance Studio V1.04 verification

The final packaged build was verified from the complete V1.04 replacement directory.

## Automated coverage

- Managed DropBeat Studio image table, admin API, public API and UI integration.
- Multi-file upload, ordered public output, move-up behavior and targeted deletion using a fresh in-memory SQLite/D1-compatible schema.
- Student Story persistence from a YouTube link pasted without `https://`, automatic thumbnail creation and immediate public retrieval.
- All 43 migrations applied in order to a fresh database.
- Dropbeat cache versions, browser revalidation and admin-triggered edge invalidation.
- Customer-facing How It Works copy, Dropbeat cookie colors and left/right footer alignment.
- V1.03, V1.02 and the inherited Dance Studio / V17.09 through V16.88 regression suites.
- JavaScript syntax checks for 398 files and import checks for all 206 Cloudflare Function modules.
- Complete HTML/static-asset checks, structural checks for all 108 CSS files, a six-route local HTTP smoke test and archive integrity.

## Expected administrator workflow

1. Open **Settings → Brand Settings → Banners**.
2. Open **Add DropBeat Studio Images** beneath **Existing Home Banners**.
3. Select one or several images, add a useful image description, choose Visible and save.
4. Use the arrows in **Existing DropBeat Studio Images** to change their rotation order.
5. Refresh the home page. The visible images appear in the purple panel beside **DropBeat Studio**.

Student Stories continue under **Settings → Pages → Student Stories**. Paste a YouTube or Instagram link, leave Thumbnail URL blank when automatic thumbnail creation is preferred, choose Active and save.
