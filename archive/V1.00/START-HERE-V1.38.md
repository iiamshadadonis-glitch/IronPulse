# DropBeat V1.38 complete replacement

Use this folder as the complete replacement for the supplied V1.37 project. Keep your existing Cloudflare environment variables, secrets and D1 binding.

## Deployment
Run `DEPLOY-V1.38-WINDOWS.bat` on Windows, or `bash DEPLOY-V1.38-MAC-LINUX.sh` on macOS/Linux. These install dependencies, run current regression checks and deploy to the existing project using its existing configuration. This UI release needs no new database migration.

After successful deployment, refresh once. Dashboard HTML is served with no-store headers and the new mobile assets have unique V1.38 filenames and build URLs. Existing open pages need a reload; cache busting cannot change a page already executing old scripts.

## Corrections
- Removed the two competing V1.36/V1.37 mobile JavaScript installers. One controller now owns the carousel, pagination, forms and late content updates. The original refresh/data handlers remain.
- Mobile metrics retain two fully visible cards and one pagination row. More than five metrics use exactly two rows; groups stay within their containers.
- Create Subscription is a full-screen mobile modal. Close returns to Sales without routing to Dashboard. Subscription and one-time modes are isolated.
- Customer Details, Class Details, Payment Details, Review & Create are separate visible steps. Back/Continue validate required inputs; final creation uses the original submit handler.
- Add/Edit Plan separates Plan Basics, Pricing & Billing, Class & Schedule, Display & Review. Body-mounted dialogs receive the same full-screen styling.
- Selectable fields and help open compact sheets; original controls, day limits and business validation remain authoritative.
- Plan prices remain inline, Add Plan is a mobile floating plus button, and the redundant next-step hint is hidden on mobile.
- Orders keeps four primary tabs; order status and Customers use their requested primary options plus More sheets. Header search/help/export/refresh use consistent icons and preserve their original actions.
- Shared enhancements are loaded by Admin, Student and Coach dashboards at phone widths only. Desktop forms and layout remain original.

Read `DANCE-STUDIO-V1.38-VERIFICATION.md` for test coverage and limits.

