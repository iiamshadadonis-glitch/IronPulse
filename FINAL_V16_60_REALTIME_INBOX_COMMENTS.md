# Urgent Casting V16.60 — Realtime Inbox + Comments Follow-up

- Inbox now renders saved D1 conversations first and performs remote fallback synchronization in the background.
- Instagram/Facebook realtime messaging webhook subscriptions are re-checked automatically from the admin session when messaging capability is connected.
- Instagram Login messaging is preferred when its token is available; Page-token/Facebook Login remains a fallback.
- Inbox local message checks run every 4 seconds for near-realtime unread badges and browser notifications while the admin browser is running.
- Comments refresh visible D1 data every 5 seconds and the notification watcher checks local stored comments every 5 seconds.
- Comments tab label changed from “Audition Articles” to “Articles”.
- Inbox notification control now mirrors the existing Comments toggle switch; the old V16.59 button is hidden.
- Emoji picker is a compact square popover anchored below the composer instead of taking over the chat area.
- Existing colors, sending logic, D1 tables, comments workflow, Posts, Payments and other admin modules are unchanged.
