# DropBeat Dance Studio V1.15 Release Notes

## Refresh stability and coach-account layout

- Removed the nullable scoped-selector path that could raise `Cannot read properties of null (reading 'querySelector')` while the admin interface was rebuilding after a refresh.
- Made the compatibility selectors used by the Pages and Brand Settings enhancements tolerate an absent or not-yet-rendered panel.
- Changed **Coach Account Status** into a closed-by-default dropdown.
- Kept Current Coaches, Past Coaches, Awaiting Approval and **Open Full Approvals** inside that dropdown, with responsive spacing around the arrow and actions.

## Login and registration

- The public account page now has three full-width modes: **Login**, **Student Sign Up** and **Coach Sign Up**.
- Login is selected by default and routes an administrator, student or coach to the correct dashboard.
- Student Sign Up now asks only for Name, Email ID, Phone / WhatsApp, optional Profile Photo, Password and Confirm Password.
- Profile photos accept common image formats up to 15 MB.
- Corrected the Cloudflare Web Crypto compatibility failure by using 100,000 PBKDF2 iterations for new and changed passwords.
- Public Google-login failures now show a safe service message and a Contact Us link. OAuth client IDs, secrets, redirect configuration and coding diagnostics remain admin-only.

## Precise coach availability

- Coach Sign Up now records any number of day-specific availability rows.
- Every row includes the day, 12-hour From and Until selectors, one or more class types, and one or more dance styles taught in that time slot.
- Founder and Co-Founder were removed from public coach registration. Available public roles are Dance Coach, Senior Dance Coach, Dance Teacher and Dance Master, with matching profile badges.
- Admin coach views show the exact submitted day, time, class types and dance styles instead of an ambiguous combined schedule.
- Approved coaches can submit add, change or remove schedule requests without directly changing an active class.

## External image storage

- Student and coach profile photos, home banners, DropBeat Studio gallery images, page images and generic brand images upload to the connected Google Drive.
- Product website crops continue to use Cloudinary and store only the returned public URL.
- New image bytes are not written to Cloudflare D1 or Cloudflare media storage by these upload paths.
- Replaced Drive images and removed Drive-backed records delete the corresponding Drive object where the workflow owns that file.

## Student and coach dashboards

- Removed **Track Order** from the public navigation. The former address securely redirects to the authenticated Student Dashboard so old links remain usable.
- Students can see linked payments, membership orders, inquiries, requests, available plans, classes, the seven-day schedule and class-specific leave or holiday notifications.
- Paid students and approved coaches can create authenticated support tickets. Admins manage them in **Business Ops → Orders & Leads → Tickets**.
- A confirmed payment links to an existing student account by verified email/phone or creates a new paid student account.
- A first-time paid customer is signed in and must create a password in a non-dismissible dashboard dialog.
- Existing student accounts retain their password and receive the new purchase in the same dashboard.
- Google Meet start/join access remains role-, class-, date- and time-restricted.

## Checkout and compatibility

- Kept the checkout summary beside the selected plans on desktop and stacked it safely on smaller screens.
- Removed the positioning condition that allowed the summary to overlap the footer.
- Added migration `0049_dropbeat_portal_tickets_checkout_v1_15.sql` and runtime-safe schema preparation without changing existing products, payments, classes, theme colours or the established admin dashboard.

