# V16.58 — Admin Login Responsiveness Hotfix

V16.58 is a narrow additive hotfix on top of V16.57.

## Problem fixed
After V16.57 deployment, the admin login page could become unresponsive: email/password fields and login buttons could not be clicked, and the browser could display a "Page is unresponsive" message.

## Root cause
The V16.57 Inbox navigation compatibility helper rewrote the Inbox navigation button's `innerHTML` every time its navigation `MutationObserver` fired. That DOM rewrite itself generated another mutation. In the complete admin script stack this could create a self-sustaining mutation cycle that starved the main browser thread before login.

## Fix
- Inbox navigation rendering is now idempotent.
- The Inbox label/badge structure is created only when needed rather than rewritten on every observer callback.
- The existing notification badge element is preserved, so unread counts can update without rebuilding the button.
- The Inbox panel heading compatibility check now writes only when the heading actually needs changing.
- No authentication, D1, payments, social integrations, Posts, Carousel, Inbox API, Comments, theme, or business logic was changed.

## Deployment
Deploy V16.58 as a complete replacement over V16.57. No D1 migration is required for this hotfix.
