# V1.39 mobile presentation corrections
This release replaces the single V1.38 mobile controller with V1.39 and adds a phone-scoped style layer.

The remaining defects came from header children inheriting stacked desktop/mobile styles, competing important CSS rules, incomplete semantic ownership of coach sections, minimum desktop widths on Contacts, an explicit width on Review cells and a canvas touch-action rule permitting only vertical panning.

V1.39 corrects those causes. Original controls, names, values, checkbox/day limits, click handlers and submit handlers remain the source of business behavior. The three dashboard shells load exactly one current mobile controller, with new asset URLs.

No schema, auth, billing, coupon, payment or attendance calculation changes were introduced.
