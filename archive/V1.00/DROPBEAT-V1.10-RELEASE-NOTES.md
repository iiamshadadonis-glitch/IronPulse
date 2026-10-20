# DropBeat Dance Studio V1.10 Release Notes

## Growth Analytics

- Separated the four analytics tabs at both API and interface level, preventing Visitor Sources data from appearing under other tabs.
- Business Results now reports New Subscribers, Renewals, One-Time Payments, Failed payments, Cancelled payments/subscriptions and Refunds with saved amounts.
- Added the Class Type filter to Business Results and Lead Generation: All Classes, Online, Offline / Studio, Demo, Webinar, Trial and Class Not Selected.
- Business chart hover details now show count, amount and the class-type breakdown for that period.
- Lead Generation counts only saved contacts with an identifying detail such as name, phone, email or a linked social identity. Anonymous visits remain Visitor Sources.
- Added Coach Results as the final tab. It compares coach-linked students, net earned value, new subscribers, renewals, one-time payments, cancellations, failures and refunds.
- Added request sequencing and cleared stale charts during tab changes so a previous tab cannot remain visible while a new result loads.
- Removed the superseded analytics controller from the active admin page and made V1.10 take ownership of any stale analytics panel left by a cached document.
- Kept the existing all-data response used by the Business Calendar.

## Help & Instructions

- Replaced the outdated help backs for Add/Edit Plan, Create Subscription and One-Time Payment with dance-studio language.
- Added solution-oriented instructions and examples for:
  - enabling Class or Event Details;
  - coach-specific class types and available days;
  - dance styles, times, duration, weekly day limits and location/link;
  - blank, fixed-visible and promotional batch start dates;
  - Hide after the start date behavior;
  - recurring student reminders and provider requirements;
  - mandatory one-time class access start/end dates and next-day access expiry.
- Added dedicated spacing, readable sections and mobile styling to prevent help text collisions.

## Coaches & Founding Team

- Fixed the About-page grid bug where hidden navigation arrows caused coach cards to be placed in the narrow arrow column.
- Active coach cards now occupy the full content column immediately.
- Preserved a maximum of three cards on desktop, two on tablet and one on mobile, with navigation arrows when more pages exist.
- Preserved two-line biography previews and two initial dance-specialty tags with See more / See less disclosure.
- Added guarded rendering and a cache-busted, no-store coach request so a delayed earlier request cannot overwrite a newer render.

## Cache and compatibility

- Activated V1.10 frontend and admin assets.
- Updated static-page asset versions and public edge-data cache namespaces from V1.09 to V1.10.
- Preserved the complete V17.09 base application and all earlier DropBeat V1.02–V1.09 behavior.
- No new database migration is required for an existing V1.09 installation.
