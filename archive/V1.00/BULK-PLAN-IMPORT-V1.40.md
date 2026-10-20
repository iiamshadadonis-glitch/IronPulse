# Bulk Plan Upload — field guide

Download `sample-plan-import.csv` from the Sales page. The older `sample-product-import.csv` download path serves the same updated sample. Use CSV (UTF-8), keep every header, and import no more than 50 plans per file.

**Required:** sku, name and description. Keep SKU stable to update an existing plan. New SKUs create new plans. Use plain rupee numbers, without a currency symbol or thousands separators. Separate list items with `|`. CSV applications quote commas, quotes and multiline text automatically.

| Field group | Columns / values |
| --- | --- |
| Basics | sku, name, slug (optional), short_description, description |
| Payment | payment_type = subscription or one_time; regular_price; offer_price_enabled = 1/0; offer_price |
| Recurring billing | billing_period = monthly/yearly; billing_interval = 1–120 |
| Trial | trial_enabled = 1/0; trial_amount in rupees (minimum 1 when enabled); trial_value; trial_unit = days/weeks/months/years |
| Features | status = draft/active/archived; badge; eligibility; features (up to 24 items of 80 characters each) |
| Capacity | spot_limit (0 = unlimited), filling_fast_limit, low_spot_limit, sort_order |
| Class | class_mapping_enabled = 1/0; class_name; class_type = online_class/offline_class/demo/webinar/trial; coach_id (optional saved active coach ID) |
| Dates | schedule_start_date, hide_start_after_date = 1/0, start_mode = purchase_date/fixed_visible/promotional_until_start, class_access_start_date, class_access_end_date; dates use YYYY-MM-DD |
| Schedule | dance_styles; class_time in 24-hour HH:MM; duration_hours; duration_minutes (remaining 0–59 minutes); days_per_week; class_days = mon\|tue\|wed...; timezone such as Asia/Kolkata |
| Meeting | meeting_provider = google_meet/zoom/external; location_or_link |
| Reminders | reminders_enabled = 1/0; reminder_minutes_before; reminder_channels = email\|whatsapp\|sms |
| Display | placements = home\|offers or your existing page keys |
| Images | image_1_url, image_1_alt, image_1_cover; equivalent columns for image_2 and image_3. Public HTTPS URLs only. Set exactly one supplied cover flag to 1, the others to 0. |

Class details must contain exactly the selected number of days and at least one dance style. An assigned coach must be active, teach those styles/types, and be available on those days. One-time plans require enabled class details and both access dates.

The sample includes two **Draft** plans: a monthly trial membership without class mapping and a one-time workshop with access dates and an unassigned coach. Adjust these examples before using them. Optional image URLs are blank so the example does not attach unrelated images.

Blank placement cells preserve the existing display selection; a non-empty list replaces it. New image URLs are appended, with a maximum of three scrolling images. Existing matching URLs are not duplicated. If you need to replace an image in a full gallery, remove the old image from Images first.

Old CSV headers such as Product Name, Regular Price, Offer Price and page_keys remain supported. Missing columns on an update retain the existing stored plan values; included cells can update or clear their corresponding text.

After import, the result shows Created / Updated / Errors and row-specific messages. A row marked **Plan saved** means its plan was saved but an image/display operation needs correction; it includes a saved ID in the API response. Correct the indicated row and retry using the same SKU. Already successful rows update instead of creating duplicates.

Optional URL images use the existing image-storage flow and remain available in Plans & Offers → Images. Social publishing is never triggered by CSV import. Gateway subscription/checkout behavior is unchanged.
