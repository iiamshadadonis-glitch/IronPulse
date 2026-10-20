# V1.38
The initial correct dashboard was subsequently rewritten by two independent mobile installers. Removing the obsolete JavaScript installers fixes the duplicate dots and changing card widths rather than masking the problem with repeated cache invalidation.

This release also repairs fullscreen and step hiding selectors for forms mounted outside the admin root, separates whole Class Details sections from Customer Details, guards invalid-field reporting against recursion, and constrains modal content between the header and sticky navigation.

New presentation changes are phone scoped. Authentication, payment creation, recurring billing, coupon rules, schema and core dashboard code are unchanged. Source hash checks protect these files.

