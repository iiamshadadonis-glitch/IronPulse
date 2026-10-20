# V16.20 — Instagram Social Media API DOM insertion hotfix

This build fixes the admin-side `NotFoundError: Failed to execute insertBefore on Node` that could appear when opening Settings → Social Media API after the V16.19 Instagram capability controls were added.

## Root cause

The V16.19 Instagram enhancement searched for the **Disconnect** button inside `.form-actions`, but that button is nested inside the V16.8 inline-actions `<span>`. The code then attempted `actions.insertBefore(newButton, disconnectButton)`. The Disconnect button is a descendant of `.form-actions`, not a direct child, so the browser correctly throws a DOM `NotFoundError`.

## Fix

The Configure Webhook Events button is now inserted into the Disconnect button's actual parent, immediately before Disconnect. If the Disconnect control is not present yet because the card is still being built, the button is safely appended to `.form-actions`.

This is an additive UI hotfix only. No social API credentials, backend endpoints, theme/color CSS, publishing logic, comment logic, payment logic, or database schema were changed.

The admin script cache query was also bumped to `v=16.20` so browsers request the corrected JavaScript after deployment.
