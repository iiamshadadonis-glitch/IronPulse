# Why the file counts differ

The numbers 468 and 25 refer to the items visible at the top of a folder. They do not count every file inside its subfolders.

The two attached ZIPs were inspected directly:

| Item | V1.00 | V1.02 |
| --- | ---: | ---: |
| All files, including subfolders | 1,829 | 931 |
| Top-level items, including configuration files | 468 | 29 |
| Frontend and static assets in public/ | 490 | 491 |
| Backend files in functions/ | 268 | 268 |
| Database migrations | 56 | 56 |

The V1.00 root had 461 files and 7 folders. Many root files were historical release notes and deployment scripts. V1.02 had 22 root files and the same 7 main folders.

## What was removed from the V1.02 package

Of the original 1,829 files, 874 remained in the active project at their existing or mapped gym filenames. Another 955 historical/support files were removed from that package: 446 root documents/scripts, 8 documentation files, 98 historical tests, 123 historical tools and 280 earlier verification files. V1.02 also added 57 files.

No original frontend, backend or migration file was lost: all 490 frontend files, 268 backend files and 56 migration files have a mapped active counterpart. The extra frontend file is release.json.

The cleanup changed the package size and file count. It did not remove membership, payment, scheduling, CRM, portal or Admin functionality. That distinction should have been explained with the earlier delivery.

## What V1.03 now preserves

- The complete current gym application is at the project root.
- Every one of the 1,829 supplied V1.00 files is also preserved byte-for-byte under archive/V1.00/.
- The archive is outside public/ and functions/. The current application uses the root project, while the archive is available for comparison and recovery.
- FILE-COMPARISON.csv contains one row for every original file, its current location/status, its preserved original location and its hashes.
- PACKAGE-CONTENTS.txt lists every delivered file.
- npm run check:complete verifies all 1,829 original hashes and all 815 expected current application files. It also runs during the build.

## What changed in application code

The comparison against the attached V1.00 verifies 504 JavaScript application files and 177 CSS files. After the documented gym text/default, filename and metadata substitutions, they match the original source. The 268 backend structures, 268 runtime schema fingerprints, 56 migration DDL sets and all 183 API endpoint file paths match.

The differences are gym display/default copy, physical filename references, document/export names and the Open Graph article namespace correction. Colours and control flow were not changed. The same stored roles, database tables/columns and API JSON keys remain in use.

V1.03 changes release labels, documentation, packaging and verification tooling. The root D1 binding remains 893e7d29-fa72-413d-9415-5d93b1c3bc6e. It does not create a new database or change the existing schema.

## Deployment

Copy ALL contents of this project into the gym repository, keeping its Git history. Use the root wrangler.jsonc and public/functions folders. START-HERE.md and CLOUDFLARE-FIX.md contain the current instructions. The archive contains older instructions for reference; deploy the root project.

A code update can replace a file's contents without adding another file. Total file count alone does not show whether application functionality is present. The per-file mapping, original archive hashes, compatibility checks and test results provide that evidence.
