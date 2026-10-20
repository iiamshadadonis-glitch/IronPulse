# DropBeat Dance Studio V1.16 Release Notes

## Compact account access

- Reduced login-card headings, tabs, inputs and buttons while retaining a comfortable responsive layout.
- Kept three clear modes with **Login** selected by default.
- Added a country-code selector, defaulting to India (+91), beside the clean local phone-number field for both student and coach registration.
- Replaced the three-part coach time controls with a single From and Until time input per session.
- Renamed the repeated coach action to **Add More Sessions**.
- Limited each availability row to one Class Type while retaining multiple Dance Styles.
- Standardised the drop-down indicator across Day, Class Type and Dance Styles.

## Student dashboard

- Separated Settings into **Profile**, **Dashboard Colours** and **Login Information**.
- Login-information changes open a confirmation dialog and require the student to type `CONFIRM`.
- Added a live dashboard **Join Session** action that recalculates availability and opens five minutes before the assigned class.
- Added **Add More Sessions**, working Memberships, payment CSV download, public plan cards and checkout handoff.
- New students without a class see available plans on their dashboard.
- Removed the redundant Orders & Requests navigation.
- Added authenticated Tickets and private post-session Reviews & Ratings.

## Attendance and private reviews

- Added **Webinars → Attendance** with Student/Coach modes, Calendar/List views, date/coach/class filters and session metrics.
- Student joins and coach starts create attendance records using the verified portal session and assigned class.
- Clicking a session count opens Present and Absent rosters.
- Clicking a student opens contact, payment, attendance and private-review details for the administrator.
- Students can rate only an eligible completed session; the administrator sees identity while coaches receive anonymous feedback summaries.

## Memberships and checkout

- Added the active-member discount controls to **Brand Settings → Checkout**.
- The discount is displayed only inside an eligible student's authenticated dashboard.
- Coupon validation and order creation both enforce active-membership eligibility.
- Plans selected inside the dashboard are added to the actual checkout cart.

## Approval safety and refresh stability

- Student approval View now includes joined sessions, class schedule, payment mode, payment status and amount, or a clear unpaid/no-session state.
- Approval requires a second dialog in which the administrator types `APPROVE`.
- Preserved the collapsed **Coach Account Status** panel and its spaced **Open Full Approvals** action.
- Hardened refresh-time DOM access so delayed legacy panels cannot cause `Cannot read properties of null (reading 'querySelector')`.
- Attendance automatically moves into the Webinars navigation group even when older navigation code finishes rendering later.

## Database

- Added migration `0050_dropbeat_attendance_reviews_membership_v1_16.sql`.
- Existing migrations, products, orders, payments, class mappings, coaches, theme colours and public content remain intact.
