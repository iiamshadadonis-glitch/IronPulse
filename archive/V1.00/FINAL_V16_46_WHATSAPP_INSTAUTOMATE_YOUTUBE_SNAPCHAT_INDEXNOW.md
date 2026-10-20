# V16.46 — WhatsApp Providers, Instautomate, YouTube, Snapchat and IndexNow

V16.46 is an additive release based on V16.45. Existing theme/CSS and established provider logic are preserved.

## WhatsApp Webhook & Order OTP
- Keeps GreenAPI support.
- Keeps direct WhatsApp Cloud API support.
- Adds Instautomate as a third provider using API Base URL + Vendor UID + Bearer API Access Token, with optional From Phone Number ID.
- Provider routing is exclusive: GreenAPI, WhatsApp Cloud API or Instautomate. The selected provider is the only provider used to send an OTP/message; another saved provider is never used as a silent fallback.
- Adds Instautomate inbound webhook payload handling through the existing Urgent Casting WhatsApp webhook endpoint.
- Adds solution-oriented setup help and direct links.
- Clarifies that a website Send OTP click does not itself open WhatsApp's customer-service conversation window. Direct Cloud API messages remain subject to WhatsApp messaging-window/template/pricing rules.

## Bing / IndexNow
- Adds official IndexNow Documentation and FAQ links plus Bing Webmaster Tools.
- Explains the key requirements and custom keyLocation verification URL already exposed by Urgent Casting.
- Keeps existing automatic Audition URL submission logic.

## YouTube
- Adds a YouTube Social Media API card immediately below Snapchat/Threads area.
- Adds OAuth 2.0 Web Application connection with callback `/api/admin/youtube-oauth/callback`.
- Requests YouTube channel-read, upload and comment-management scopes.
- Adds automatic video Audition publishing when an Audition has a public video URL; text/image-only Auditions are safely skipped.
- Adds YouTube comment synchronization to the Comments workspace and supported reply/edit/delete/moderation actions.

## Snapchat
- Adds a Snapchat / Snap Kit card below Threads.
- Provides Client ID configuration and capability-safe setup guidance.
- Does not fake silent backend Story publishing or general comment moderation because standard Snap Kit exposes user-confirmed Creative Kit sharing rather than Facebook-style server publishing.

## Theme protection
- No CSS file was changed from V16.45.
