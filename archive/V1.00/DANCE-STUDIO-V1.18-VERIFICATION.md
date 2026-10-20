# DropBeat Dance Studio V1.18 Verification

## Root cause

An admin-only MutationObserver watched the hidden state of Business Ops badges. Its callback wrote hidden=true to a badge that was already hidden, which could trigger the same observer again. Because the follow-up work was queued as a microtask, the browser could continuously service badge callbacks while the rendered Admin Dashboard appeared normal but did not process clicks.

## Correction

- Badge text and visibility assignments are now idempotent.
- The Business Ops observer batches work on an animation frame.
- The observer disconnects during its own normalization and reconnects afterward.
- Existing notification counts, acknowledgement rules, routes and loaders are unchanged.
- Equivalent no-op write guards were added to the existing admin navigation and Inbox badge refreshers.

## Automated coverage

- dynamic execution of the production admin badge script in a tracked fake DOM
- proof that an already-hidden, empty Tickets badge receives zero writes
- proof that the observer disconnects before normalization and reconnects afterward
- static checks for guarded writes across all three interacting admin badge scripts
- complete inherited V17.09 and DropBeat V1.01–V1.17 regression chain
- JavaScript syntax checks for every changed script
- archive integrity and source-difference verification

## Scope verification

No student dashboard asset, public theme stylesheet, server API, migration or business-logic file is changed by V1.18. The release is an admin responsiveness correction only.
