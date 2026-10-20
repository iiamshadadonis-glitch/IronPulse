# Automation API for Automation Software

Base URL:

```text
https://ironpulse-gym.pages.dev
```

Header:

```http
Authorization: Bearer YOUR_AUTOMATION_API_KEY
Content-Type: application/json
```

## Update site settings / tracking IDs

```http
POST /api/automation/site
```

```json
{
  "googleAnalyticsMeasurementId": "G-XXXXXXXXXX",
  "googleTagManagerId": "GTM-XXXXXXX",
  "metaPixelId": "1234567890",
  "searchConsoleVerification": "google-site-verification=abc",
  "socials": [
    { "key": "instagram", "label": "Instagram", "url": "https://instagram.com/yourpage", "enabled": true },
    { "key": "whatsapp", "label": "WhatsApp", "url": "https://wa.me/9193919375", "enabled": true }
  ]
}
```

## Publish fitness update

```http
POST /api/automation/fitness updates
```

```json
{
  "title": "Audition Updates WhatsApp Group in India",
  "slug": "fitness-updates-whatsapp-group-india",
  "excerpt": "Learn how fitness update groups help members find fitness calls faster.",
  "body_html": "<p>Your fitness update details...</p>",
  "status": "published"
}
```

## Add or update products

```http
POST /api/automation/products
```

```json
{
  "products": [
    {
      "sku": "UC-FESTIVAL",
      "name": "Festival Access Offer",
      "slug": "festival-access-offer",
      "regular_price": 599,
      "offer_price": 299,
      "badge": "Festival Offer",
      "features": ["WhatsApp updates", "Limited-time offer"],
      "status": "active"
    }
  ]
}
```

## Leads and orders summary

```http
GET /api/automation/leads-summary
```

Returns last 30 days of contact leads and order status groups.

## Important limitation
This website API can store and inject GA4, GTM, Meta Pixel and Search Console verification values. Automatically creating Google Analytics properties, Google Ads links or Search Console properties must be done from automation software using Google APIs and OAuth credentials.
