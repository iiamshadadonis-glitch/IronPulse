# Last-mile UI polish

This build keeps the existing business/API logic and adds the requested final interface refinements:

- Smoother browser-tab title marquee (short, even title updates instead of 650 ms jumps).
- Festival Offers and empty Auditions notices centered in a wider rectangular card.
- Success Story thumbnails restored to responsive 16:9 rectangles on Home and Success Stories.
- 404 page redesigned as a centered full-size focal card.
- 404 admin editor split into Top Content and Bottom Content while keeping the same database field/API.
- Tracking Enable controls rebuilt with the same compact toggle-switch style used elsewhere.
- Global async feedback for admin action buttons: disabled/loading state, anti-double-click protection, and success/error toast.

No product, order, subscription, payment, placement, ad-network, tracking, or authentication API behaviour was intentionally changed.
