# V16.55 — Social Media Posts Restore

V16.55 is based directly on V16.54. It restores the existing Posts entry under Social Media without changing the Posts backend or publishing logic.

- Social Media order: Article → Posts → Comments.
- Posts uses the existing V16.48 workspace and its Text Post, Image, Video, Story / Status and Scheduling tabs.
- Existing social-post API, scheduler migration, Google Drive Posts folder, platform capability checks, publishing and scheduled-target handling are unchanged.
- The V16.55 guard only prevents later navigation compatibility code from leaving the Posts menu item absent.
