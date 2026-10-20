# DropBeat Dance Studio V1.29

This complete replacement is built directly from the supplied V1.28 package. It repairs the reported plan-row blinking, first-open delays, stale page names, incomplete brand-colour propagation and unreadable dark mode. It also adds three optional frontend layouts while preserving the original DropBeat theme as the default.

## Safe deployment

1. Back up the current Cloudflare Pages project and D1 database.
2. Replace the project files with this complete package. Do not delete or recreate D1.
3. Run `DEPLOY-V1.29-WINDOWS.bat` on Windows or `bash DEPLOY-V1.29-MAC-LINUX.sh` on macOS/Linux.
4. The helper installs dependencies, runs V1.29 and every inherited regression test, applies only the existing additive migrations, and deploys only after tests pass.

## Verify after deployment

- Sign in to Admin and open Business Ops → Plans & Offers. The first plan should remain stable without blinking.
- Open Plans & Offers, Social Media → Automations, Chatbot DMs and Lead Nurturing twice. Repeated opens should use the short-lived shared data snapshot rather than duplicate reads.
- In Settings → Pages, rename a header item and save it. Refresh the home page and the renamed page; the same new label and slug should remain everywhere.
- In Settings → Brand Settings → Website Colors, save manual or preset colours. Confirm buttons, accents, footer and dashboard navigation use the saved palette.
- Open the adjacent Theme tab. Preview and save DropBeat Original, Casting Editorial, Studio Spotlight or Modern Minimal. Reset Theme restores DropBeat Original.
- Switch both public pages and dashboards to dark mode and verify headings, plan details, forms, cards and tables remain readable.

V1.29 does not change payment creation, login authentication, checkout coupon calculations, schedules, remuneration, D1 migrations or existing records.
