# V16.76 — D1 Read Guard, Poll Placement and Automation Workspace

## D1 row-read correction

The V16.75 public-page middleware invoked lead enrollment for every ordinary website page view. Each invocation could read hundreds of lead rows, and each due lead could scan up to 500 recent orders to detect a purchase. V16.76 removes that traffic-triggered lead scan.

Newly captured leads still enroll and run an immediate zero-delay step from the exact capture event. Scheduled follow-ups continue through the protected `/api/automation/lead-nurture` endpoint.

The new `d1_background_read_budget` guard uses these defaults:

- 750,000 estimated guarded rows: pause scheduled batch scanning.
- 1,250,000 estimated guarded rows: hard-pause guarded background work until the next UTC day.
- Event-specific lead delivery may use the 500,000-row reserve between those background limits, but cannot reserve work beyond the hard ceiling.
- At least 750,000 rows remain outside the background budget for normal foreground/admin activity, keeping the overall design ceiling at 2,000,000 rather than allowing guarded background tasks to consume the full daily target.

These conservative counters cover app-controlled nurturing background work. Cloudflare dashboard totals can also include foreground, console, migration and other external queries, which cannot be intercepted by application code.

Purchase stopping now uses indexed exact email/phone lookups instead of reading 500 orders for every due lead. Periodic enrollment is bounded to 100 recent eligible leads.

## Polls

- Article: Add Poll Optional is mounted immediately after Schedule this post and before the action buttons.
- Posts: Text, Image, Carousel and Video forms render their poll control directly, rather than depending only on a late DOM injection.
- Polls tab: opens Text Poll, Image Poll, Carousel Poll or Video Poll and automatically enables the optional poll in the chosen composer.
- Delivery remains capability-aware. Unsupported platforms publish the original post without a poll.
- Article help includes poll instructions and additional inner spacing.

## Automations

The Automation workspace now displays:

1. Chatbot DM
2. Chatbot Comments
3. Lead Nurturing
4. Comment Triggers DM

Comment Triggers DM uses the existing dotted visual automation builder and saves to the dedicated `comment_dm` channel for Facebook and Instagram keyword-triggered private replies.

Lead Nurturing uses a dotted schedule board with a New Lead start, ordered WhatsApp/Email/SMS nodes and a purchase-stop node. Its library follows the existing Flow Name / Trigger / Status / Enable / Actions grid and supports edit, delete, enable and Run Due Now.

## Deployment

Deploy as a complete replacement, then apply `migrations/0036_v16_76_d1_read_guard.sql`. Keep the existing protected automation token configured and call `/api/automation/lead-nurture` at the desired due-step cadence.
