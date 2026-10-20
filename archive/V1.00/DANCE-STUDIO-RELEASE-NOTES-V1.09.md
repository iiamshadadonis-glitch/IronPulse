# DropBeat Dance Studio V1.09 release notes

V1.09 adds compact public coach profiles, coach-specific scheduling guardrails, and targeted speed improvements while preserving the existing DropBeat colours and inherited business logic.

## Public coach cards

- Shows no more than three coach cards at a time on desktop, two on tablet, and one on mobile.
- Adds visible previous and next arrow controls plus a “Showing X–Y of N coaches” indicator.
- Keeps every card the same compact initial height.
- Limits the biography to two lines and dance specialties to two tags until the visitor selects **See more**.
- **See less** collapses the biography and tags back to their compact state.
- A direct coach link such as `/about#coach-name` automatically opens the page containing that coach.

## Coach availability and class types

- Adds **Class Types They Conduct** beneath Available Days in Add/Edit Coach.
- Supports Online Class, Offline / Studio Class, Demo Class, Webinar, and Trial Session.
- Selecting a coach in Plan Add/Edit, Create Subscription, or One-Time Payment now:
  - removes unavailable weekdays from Class Days;
  - limits Days per Week to that coach's availability;
  - shows only the class types that coach conducts.
- Online, Offline, and Demo / Webinar coach workspaces show only relevant coaches.
- Server validation rejects unavailable days and unsupported class types even if an old browser tab submits stale values.
- A coach cannot lose a day or class type that is still required by an active assignment. Replacement coaches must also satisfy the affected schedule.

## Responsiveness and latency

- Reuses a completed schema check during each worker lifetime instead of repeating the full dance-studio schema inspection for every request.
- Existing V1.08 databases use a targeted one-column V1.09 upgrade before the full compatibility fallback is considered.
- Coach save, reorder, enable, disable, and removal responses include the refreshed coach list, avoiding a second blocking fetch.
- Public cache invalidation runs through Cloudflare's background lifecycle and no longer keeps admin actions spinning.
- Workspace membership synchronization starts after the calendar, sessions, members, and coaches have rendered.
- Admin product loading batches plan images, variants, and class mappings instead of running repeated per-plan reads.

## Compatibility and cache refresh

- Adds migration `0046_dropbeat_coach_class_types_performance.sql` and safe runtime self-repair for non-coder replacement deployments.
- Uses V1.09 frontend/admin asset filenames and `v109` public API cache keys.
- Keeps the DropBeat palette, payment flows, subscriptions, orders, customers, integrations, reminders, and notification logic intact.
