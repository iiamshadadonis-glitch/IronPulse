# Urgent Casting V14.9

This build keeps V14.8 application/payment logic and applies only the requested presentation changes.

- Restores the V13 visual theme mapping for the public site and admin shell (dark/light placement, gradients and fixed maroon treatment), without reverting V14.8 business logic.
- Trial product cards no longer disclose the configured trial duration or future recurring-charge timing.
- Trial checkout line item shows the regular/offer prices struck through and only the trial price as the current visible price.
- Trial order summary removes the separate “Trial charge today” row. For an all-trial cart, Actual price and Regular subscription total are struck through; Total charged today remains highlighted in the theme color.
- Secure Subscription Payment says only “Pay ₹X today to start your trial” and removes future recurring-charge/date copy.
