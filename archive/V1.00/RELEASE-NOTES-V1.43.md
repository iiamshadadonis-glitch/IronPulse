# DropBeat Dance Studio V1.43 — fixes included in this replacement

This is the complete V1.42 project with the following V1.43 presentation fixes. New responsive styling is restricted to mobile viewports (760px and below). Saved brand colors remain authoritative. The original payment, refund, subscription, authentication, database and publishing handlers are retained.

## Sales
- Added a centered **Create Subscription** navigation row to the closed + Subscription view. It uses the shared disclosure indicator and reopens the existing full-screen subscription wizard. Closing the wizard leaves the Sales launcher available.
- Replaced the Product Images Upload step's exposed file input with a dashed native upload area, retaining its original file binding and upload handler.
- Reduced Product Image URL/Alt Text input height and typography; removed the bulky cover-checkbox border.
- Moved long image/Drive/crop instructions into the existing image Help sheet; mobile upload content stays compact.
- Converted Product Placements plan/page choices into compact single-column rows and moved deep instructions into header Help.
- Made Current Product Display records complete mobile cards, with Status and Delete visible. The existing grid paginator now retains mobile card display rather than reverting rows to desktop contents.

## Heat Maps
- Deferred the live website preview until it approaches the viewport; deferred overlay drawing to idle time.
- Added lazy/async image and low-priority media hints inside the preview, disabled preview video autoplay, and requested smaller existing Google Drive image renditions when available.
- The existing preview is a live embedded website, not a stored screenshot. Its device width and overlay coordinates are preserved; no image compression service or new screenshot backend was introduced.
- Replaced Top Engagement Elements with the shared navigation-row treatment. It stays at the bottom left at no more than half the viewport width, clear of the existing right-hand Filter FAB.
- Removed the mobile whitespace left by the original engagement panel.

## Webinars and Members
- Applied first-paint responsive CSS to Current/Past member grids in Online, Offline and Demo views. Raw desktop rows and name-button boxes no longer require a delayed DOM conversion to obtain mobile card styling.
- Replaced running-class Join Session/Manage Class desktop buttons with mobile navigation rows that delegate to the original actions. Disabled joining remains disabled.
- Added the shared coach-choice sheet to Manage Current Class and padded its title/header.
- Preserved existing class, attendance and coach change handlers.

## Dance Tips and Social Posts
- Kept desktop Dance Tip/Advertisement accordions and their original inline behavior; mobile gets shared navigation rows and full-screen forms.
- Standardized mobile form headers, body scrolling and bottom navigation. Poll headers/Close and footers stay inside the viewport, including after source validation tries to scroll a field into view.
- Added native file areas to Dance Tip, Advertisement and Page editor forms; retained original inputs and handlers.
- Constrained switches to native proportions, tightened Review spacing, moved heavy Dance Tip guidance to Help and made Load Dance Tips compact.
- Fixed form classification when a hidden field named id shadows HTMLFormElement.id. Dance Tip and other forms now receive the intended step grouping.
- For Social Post QA, Continue and numbered indicators allow free navigation through incomplete steps. Required content, media, platform and enabled-poll checks still run on the final Publish/Schedule action.
- Removed carousel slot-number badges from the mobile DOM and restored them when returning to desktop.

## Automations
- Standardized mobile templates as clean stacked cards and grouped primary actions.
- Corrected stacking for the flow workspace, email editor, template picker, Add Workflow Step and Email Preview dialogs. Child dialogs appear above the builder and retain Close.
- Added a mobile vertical DM/Comment/Comment-to-DM builder using the original nodes. A centered + opens Content Blocks and inserts the selected step through the original node model.
- Kept branching connections editable through a Next Step sheet and retained original desktop drag/drop/canvas behavior.
- Made Lead Nurturing a full-width timeline with Trigger & Rules in a sheet and + controls that insert existing follow-up actions.
- Converted Automation Activity Hub records to mobile cards.

## Settings
- Existing Pages now open individual Editor → Review full-screen mobile forms, with each page's original Save action. Hidden field/DOM state survives switching back to desktop.
- Added a shared Create New Page launcher and compact Website Header Order controls.
- Corrected Add Custom Code header/Close and removed the nested specific-pages scroll trap.
- Student Stories opens directly in its wizard; Sort/Edit/Delete actions are grouped at the card's bottom right and restore their desktop locations on resize.
- Converted Approvals' five summary metrics into compact two-visible snap cards with pagination dots; kept its tab bar horizontally scrollable without edge clipping.
- Tracking setup rows open their existing full-screen wizards directly. Toggles stay compact. Review identifies each platform, e.g. Snapchat Pixel ID: Disabled and X / Twitter Tracking: Enabled, rather than generic Enable labels.

## Release delivery
- Added V1.43 asset names/build URLs and matching middleware delivery across Admin, Coach and Student shells, avoiding duplicate controllers.
- Retained all files from the supplied V1.42 project, including previous release notes.
- Included current regression/browser tests, deployment scripts, verification notes and a SHA-256 file manifest.
- No new database migration or database reset is required. Keep the existing Cloudflare project, D1 binding, secrets and integration configuration.

See DANCE-STUDIO-V1.43-VERIFICATION.md for the executed checks and their scope.

