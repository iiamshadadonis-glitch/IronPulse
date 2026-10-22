# Cloudflare configuration — V1.09

The earlier database-error screenshot showed this failure after the assets uploaded successfully:

    D1 binding 'DB' references database '16c9361a-625c-4c71-8ecb-6608a8836152' which was not found.

It also says no build command was specified. The old administrator identifier is another sign that this deployment is reading the older configuration. The Worker compiled; the final publish failed while validating the database binding.

## Correct configuration included in this project

The root wrangler.jsonc contains:

    "d1_databases": [
      {
        "binding": "DB",
        "database_name": "ironpulse-gym-db",
        "database_id": "893e7d29-fa72-413d-9415-5d93b1c3bc6e"
      }
    ]

The UUID selects the existing gym database. If its actual name differs, update database_name to that exact name, retaining this UUID and DB binding. The optional npm run check:cloudflare command resolves the actual name after you sign into the owning account.

## Apply the fix

1. Extract V1.09.zip. Open the V1.09 folder. It contains the complete project, including the public, functions and migrations folders.
2. Open the gym repository using GitHub Desktop. Move its old project files to a backup location outside the repository, retaining .git. Copy ALL contents from the extracted V1.09 folder into the repository root, including wrangler.jsonc and the folders.
3. Confirm that there is one active Wrangler configuration: the supplied wrangler.jsonc. Do not retain an old wrangler.toml or wrangler.json alongside it.
4. Commit the complete replacement and push it to the branch used by the gym Pages project. GITHUB-SUMMARY.txt contains the ready-to-copy commit title and description.
5. In Cloudflare, use the gym Pages project and the same account that owns database 893e7d29-fa72-413d-9415-5d93b1c3bc6e.
6. Set Framework to None, Root directory to the repository root (blank), Build command to npm run build, and Build output directory to public. Use Node 24.
7. Add ADMIN_LOGIN_PASSWORD as an encrypted Production secret with your own unique password. The login identifier in this package is admin@ironpulse-gym.local.
8. Deploy the NEW commit you pushed. Retrying the previous failed commit will reuse its old files.
9. Confirm that the build log prints:

       IronPulse Gym V1.09 (package 1.9.0)
       D1 binding DB: 893e7d29-fa72-413d-9415-5d93b1c3bc6e

   The optional Git commit line prints the commit Cloudflare is building. If the log still shows the old UUID, check the selected repository, branch, root directory and commit.
10. After Cloudflare marks the deployment successful, open /release.json on the deployed gym website. It should show version V1.09 and package_version 1.9.0. Then test /login and /member-dashboard.

If the new UUID is also reported as not found, verify the owning Cloudflare account and the exact ID in D1. The local project cannot grant access to a database owned by another account.

When Wrangler configuration is used for Pages, the committed configuration is the source of truth for its binding fields. Change the file and deploy the new commit rather than trying to override the same field in the dashboard.

## What is preserved

No database schema or business rule was changed to address this publishing error. Existing runtime schema initialization was already verified against a completely empty local D1. A normal deployment does not require recreating the database or replaying every migration over a database the application already initialized.

## Reference

- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://developers.cloudflare.com/pages/configuration/build-configuration/

These instructions address the configuration shown in the screenshot. Remote database access and live publishing still require your Cloudflare account session.

## Original-source archive

Copy archive/ along with the root project. It preserves the original source for comparison and is checked during the build. It is outside the live public/functions folders; use the root wrangler.jsonc for the gym deployment.
