# Dance Studio deployment guide

Use the root `DANCE-STUDIO-SETUP.md` instructions. The critical rule is to create a **new** D1 database named `dropbeat-dance-studio-db` and replace `REPLACE_WITH_NEW_DANCE_D1_DATABASE_ID` in `wrangler.jsonc`. Never reuse the Urgent Casting database ID.

After configuring your real domain, replace the temporary `https://dropbeat-dance-studio.pages.dev` value in `wrangler.jsonc` with your final HTTPS domain and update Search Console from Admin → Integrations.
