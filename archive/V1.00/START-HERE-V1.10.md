# DropBeat Dance Studio V1.10 — Start Here

This folder is the complete replacement website code. It is not a small patch and no code needs to be pasted into the admin panel.

## If your website is connected to GitHub / Cloudflare Pages

1. Unzip the V1.10 replacement package.
2. Replace the files in the existing website project with the files inside the unzipped V1.10 folder. Keep the folder structure exactly as supplied.
3. Upload or commit the replacement to the same repository/branch already connected to the `dance-class` Cloudflare Pages project.
4. Wait for that Pages deployment to finish successfully.
5. Open the website and admin panel, then refresh once. V1.10 uses new frontend, admin and public-data cache versions, so the previous V1.09 assets are not reused.

## Database note

V1.10 adds no new migration. A website that already runs V1.09 does **not** need a separate migration command for this update. Existing D1 records, plans, coaches, students, payments, settings and integrations are retained.

The `npm run ...` commands in `package.json` are developer/terminal commands. They are not text that should be pasted into the website, Cloudflare admin page, or DropBeat admin panel.

## Five-minute demo check

1. Admin → Analytics → Growth Analytics:
   - Business Results shows payment/subscription outcomes.
   - Visitor Sources shows visitors only.
   - Lead Generation shows identified leads only.
   - Coach Results shows coach-linked students and money results.
2. In Business Results and Lead Generation, choose a Class Type and press Apply.
3. Sales → Plans & Offers → Add or Edit → open Help & Instructions and review the new Class or Event Details guidance.
4. Sales → Create Subscription and One-Time Payment → open Help & Instructions and review the class/access examples.
5. Public About page → verify active coach cards are visible. Biographies start at two lines, only two specialties show initially, and See more / See less reveals the rest.

## Important

- Do not delete the existing Cloudflare environment variables, secrets, D1 binding or production domain.
- Deploy V1.10 to the same project so existing data and integrations remain connected.
- The replacement preserves the DropBeat theme colors and existing unrelated business logic.

