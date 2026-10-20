# V17.05 Release Verification

## Lead Email Follow-up automation

- Added **Social Media → Automations → Lead Email Follow-up** without replacing the existing DM, Comments, Lead Nurturing or Comment Triggers DM flows.
- Added current workflows, drafts and a categorized template gallery with welcome, checkout recovery, purchase, promotion, retargeting, course, webinar, birthday, premium-member, demo, renewal and NPS templates.
- Added a visual ordered workflow with insert-between controls and drag-and-drop for Email, Time Delay, Condition, Internal Notification, Add/Remove Group and Exit steps.
- Added a right-side editor for trigger, delivery, tracking, UTM, reply-to, flexible delays, multiple condition rules, notifications and groups.
- Added a branded block email editor with navigation, hero, headings, content, buttons, uploaded images, sections, special content, products, gallery, Blog/RSS, social, footer, saved brand styles and reset-to-website-brand controls.
- Added reusable content templates, plain-text editing, desktop/mobile preview, test delivery, missing-URL checks, typed content-removal confirmation and version restoration.

## Runtime and data safety

- Existing automatic branded emails remain unchanged.
- New tables are created automatically with `CREATE TABLE IF NOT EXISTS`; no manual D1 migration is required for this release.
- Due work uses an indexed `(status, next_run_at, id)` query and shares the existing protected lead-nurturing automation endpoint.
- New/updated leads enroll at capture time. Checkout, successful-purchase and webinar events use event-driven enrollment. Other integrations can use the protected `/api/automation/email-event` endpoint.
- Event context is stored with each enrollment, so delayed steps retain the correct checkout link, product name, webinar title and event link.
- Event-based workflows do not bulk-enroll unrelated existing contacts merely because the admin activates or saves them.
- Birthday/date matching is scanned at most once per UTC day and only when such a workflow is active.
- Open tracking, UTM links, Gmail reply-to, unsubscribe suppression and activity reporting are isolated to the new automation.

## Verification

- `npm run test:v17.05`
- JavaScript syntax validation for all new and modified Functions/admin files.
- D1-backed test covers table creation, templates, save/edit versioning, event enrollment/context retention, list retrieval, open tracking and unsubscribe suppression.
