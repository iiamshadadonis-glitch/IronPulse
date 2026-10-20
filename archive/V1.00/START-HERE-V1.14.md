# DropBeat Dance Studio V1.14 — Start Here

This is a complete replacement package. It keeps the existing DropBeat public website, admin dashboard, payments, plans, classes, coach records and theme, then adds the unified account system requested for administrators, students and coaches.

## Deploying the replacement

Use the same complete-replacement upload/deployment method you used for V1.13. You do not need to paste individual code blocks or run `npm` commands.

The new account tables and coach fields are additive. They are included in migration `0048_dropbeat_role_portals_approvals.sql`, and the application also prepares the missing account tables safely when the new account or Approval screens are first used. Existing records are not deleted or renamed.

After deployment:

1. Open the public website in a new private/incognito window.
2. Confirm the menu now says **Login**, not Admin Login.
3. Sign in with the existing admin email and password. It should open the unchanged admin dashboard.
4. Open **Settings → Approval** to see new student applications, coach applications, schedule requests, current coaches and past coaches.
5. Open **Settings → Pages → Coaches & Founding Team** to see the added lifecycle block on the existing coach page.

## Google Login setup

Google Meet and Google Login are related Google services, but they use different callback addresses. The website can reuse the Google OAuth Client ID and Client Secret already saved in:

**Settings → Integrations → Webinars → Google Calendar / Meet**

In the same Google Cloud OAuth Web application, add this additional **Authorized redirect URI**:

`https://YOUR-WEBSITE-DOMAIN/api/portal/google/callback`

For the Pages address shown in the supplied screenshots, this would be:

`https://dance-class-at2.pages.dev/api/portal/google/callback`

Keep the existing Google Calendar/Meet callback URI as well. Do not replace it. After adding the new URI:

1. Open **Settings → Brand Settings → Login**.
2. Click **Connect Google Account**.
3. Choose the administrator's Google account on Google's own consent screen.
4. Future **Continue with Google** logins will open the correct admin, student or coach dashboard by account role.

There is no “coding access” step in V1.14. That old guidance has been removed.

## Why the admin email confirmation did not arrive

Google Meet does not send transactional email. Admin email-change confirmation codes require an enabled email sender.

Open **Settings → Integrations → Email & OTP**, then connect and test one provider (Gmail or another supported email provider) and enable its **OTP sending** option. Once connected, **Send Confirmation Code** sends a real six-digit email code that expires after ten minutes. If the sender is missing or disabled, the admin panel now shows the exact provider error and does not pretend that an email was sent.

## Account behavior

- Existing admin credentials open the existing admin dashboard.
- A student signing up with the same email as a verified paid/current membership is activated automatically.
- Other student accounts remain pending until approved in **Settings → Approval**.
- Every coach application remains pending until an administrator approves it.
- Only approved, active coaches are published to the public About page.
- Removing an unapproved coach requires typing `REMOVE` and permanently deletes that unapproved application.
- Removing a current coach with active work requires a replacement coach and moves the removed coach to Past Coaches.
- Coach schedule additions, changes and removals are requests; they affect the class calendar only after admin approval.

## Secure Google Meet sessions

- Approved coaches can start only sessions assigned to their coach account.
- The website creates or reuses the day's Google Meet through the existing Google Calendar/Meet integration.
- Students never receive a meeting URL in the dashboard data.
- A paid, active student can use **Join Session** only from five minutes before the assigned start time until the session ends.
- The button stays unavailable on other days and for cancelled, leave or holiday sessions.
- Google may still apply its own organizer/admission controls after the secure website handoff.

## First-login Google Meet reminder

Students enrolled in online classes and coaches assigned to online work see a one-time Google Meet installation reminder. Mobile visitors receive the appropriate Play Store or App Store link. Dismissing it stores that choice only for their own account.

