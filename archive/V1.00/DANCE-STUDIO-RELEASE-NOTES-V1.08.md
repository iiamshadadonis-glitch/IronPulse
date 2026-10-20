# DropBeat Dance Studio V1.08 release notes

V1.08 adds the requested class-access and coach-continuity workflows without replacing the existing payment, order, customer, integration, or notification systems.

## Plans and manual payment links

- Renamed the admin section to **Class or Event Details** and replaced technical wording with dance-studio language.
- Replaced class linking and recurring-reminder checkboxes with accessible on/off switches.
- Added three public batch start behaviours:
  - no date: each paid member starts on the payment date and joins the ongoing weekly batch;
  - fixed date: the original start remains visible as an ongoing batch;
  - promotional date: the start date creates urgency through that date and disappears afterward while enrolment remains open.
- Expanded the multi-select dance-style list with Indian classical, South Indian, folk, social, and international styles.
- Connected **Days per week** to **Class days**. Once the permitted number is selected, unselected days are visibly disabled.
- Added the same class, coach, schedule, dance-style, location, and reminder fields to **Create Subscription**.
- Added mandatory class-access start and end dates to **Create One-Time Payment**. The link is not generated until both dates are valid.

## Membership access

- Paid manual subscriptions and one-time links now create the same class membership records used by plan purchases.
- One-time access remains active through the selected end date and moves to Past after that date.
- Track Order now shows upcoming, active, last-day, and expired one-time access messages with renewal and studio-contact actions.
- Manual classes are included in class calendars, scheduled sessions, reminders, member counts, and session edits.

## Coaches and continuity

- Added left/right ordering controls to coach cards.
- Added a clear Active switch and Remove action.
- Disabling or removing a coach checks active plan classes, manual class links, current students, and future sessions.
- When active work exists, the admin must select an active replacement coach. The replacement is then applied to all affected class links, current members, and future schedules in one operation.
- Member grids now show the coach name in a dedicated column for online, offline, demo, and webinar workspaces.

## Compatibility and cache refresh

- Added migration `0045_dropbeat_class_access_coach_continuity.sql` plus safe runtime schema initialization for non-coder deployments.
- Added V1.08 frontend/admin asset filenames and `v108` API cache keys.
- Preserved V17.09 application compatibility and existing DropBeat colours.

