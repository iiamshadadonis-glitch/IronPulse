# Urgent Casting V15.2 — Blogger Sync & API Settings UI

This additive update keeps V15.1 logic/theme and focuses on Blogger workflow clarity.

## Changes
- **Load Audition Updates** is now the single sync action. It synchronizes both published Blogger posts and Blogger drafts from the currently selected **Blog Name**, then loads them into Existing Auditions.
- Imported published posts remain `published`; imported drafts remain `draft` and stay hidden from the public `/blog` listing.
- Existing Auditions keeps icon-only actions: Edit, Move to Draft, Delete. The Draft action uses a document/edit icon with a `Move to Draft` hover label.
- API Settings is separated into two independent collapsible cards:
  - **API Base URL & Automation**
  - **Blogger Connection**
- Each card uses the existing themed information/back-card system.
- Blogger fields are ordered as: OAuth credentials → Redirect URI → Blogger API Key Optional → Blog Name → Manual Blog ID Optional / Connection Check.
- `Blogger Blog` is renamed to **Blog Name**.
- `Manual Blogger Blog ID Optional` is renamed to **Manual Blog ID Optional**.
- `Use Blog ID` is renamed to **Connect Blog ID**.
- Removed the redundant visible `Blogger direct connection setup` block; its guidance is now inside the information card.
- Blogger has its own **Save Blogger Connection** action. Automation API settings have their own **Save API Settings** action.

## No theme changes
No existing theme/color CSS file was edited. V15.2 adds only layout CSS that inherits the current admin theme variables.
