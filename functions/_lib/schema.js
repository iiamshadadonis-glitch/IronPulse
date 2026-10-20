import { ensureMediaTable } from './media.js';
import { ensurePaymentReceiptsTable, backfillPaymentReceipts } from './payment-receipts.js';
import { withD1Retry } from './utils.js';

const INITIAL_SCHEMA = [
  "PRAGMA foreign_keys = ON",
  "CREATE TABLE IF NOT EXISTS settings (\n  key TEXT PRIMARY KEY,\n  value TEXT NOT NULL,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS media_assets (\n  id TEXT PRIMARY KEY,\n  filename TEXT NOT NULL,\n  object_key TEXT NOT NULL UNIQUE,\n  public_url TEXT NOT NULL,\n  content_type TEXT NOT NULL,\n  byte_size INTEGER NOT NULL DEFAULT 0,\n  data_base64 TEXT NOT NULL,\n  storage_type TEXT NOT NULL DEFAULT 'd1',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS products (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  sku TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  slug TEXT NOT NULL UNIQUE,\n  type TEXT NOT NULL DEFAULT 'subscription',\n  short_description TEXT,\n  description TEXT,\n  regular_price_paise INTEGER NOT NULL DEFAULT 0,\n  offer_price_paise INTEGER NOT NULL DEFAULT 0,\n  currency TEXT NOT NULL DEFAULT 'INR',\n  status TEXT NOT NULL DEFAULT 'active',\n  badge TEXT,\n  features_json TEXT NOT NULL DEFAULT '[]',\n  eligibility TEXT,\n  spot_limit INTEGER NOT NULL DEFAULT 0,\n  filling_fast_limit INTEGER NOT NULL DEFAULT 0,\n  low_spot_limit INTEGER NOT NULL DEFAULT 0,\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  seo_title TEXT,\n  seo_description TEXT,\n  billing_interval INTEGER,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS product_variants (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  product_id INTEGER NOT NULL,\n  sku TEXT NOT NULL UNIQUE,\n  name TEXT NOT NULL,\n  billing_months INTEGER NOT NULL DEFAULT 1,\n  horizon_years INTEGER NOT NULL DEFAULT 21,\n  total_count INTEGER NOT NULL DEFAULT 252,\n  regular_price_paise INTEGER NOT NULL DEFAULT 0,\n  offer_price_paise INTEGER NOT NULL DEFAULT 0,\n  setup_amount_paise INTEGER NOT NULL DEFAULT 0,\n  currency TEXT NOT NULL DEFAULT 'INR',\n  razorpay_plan_id TEXT,\n  stripe_price_id TEXT,\n  status TEXT NOT NULL DEFAULT 'active',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE\n)",
  "CREATE TABLE IF NOT EXISTS product_images (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  product_id INTEGER NOT NULL,\n  object_key TEXT NOT NULL,\n  public_url TEXT NOT NULL,\n  alt_text TEXT,\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  is_cover INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE\n)",
  "CREATE TABLE IF NOT EXISTS page_placements (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  product_id INTEGER NOT NULL,\n  page_key TEXT NOT NULL,\n  section_key TEXT NOT NULL DEFAULT 'featured',\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  visible INTEGER NOT NULL DEFAULT 1,\n  starts_at TEXT,\n  ends_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(product_id, page_key, section_key),\n  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE\n)",
  "CREATE TABLE IF NOT EXISTS banners (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  title TEXT NOT NULL,\n  subtitle TEXT,\n  desktop_image_url TEXT,\n  mobile_image_url TEXT,\n  object_key TEXT,\n  link_type TEXT NOT NULL DEFAULT 'product',\n  link_value TEXT,\n  badge TEXT,\n  visible INTEGER NOT NULL DEFAULT 1,\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  starts_at TEXT,\n  ends_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS studio_gallery_images (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  image_url TEXT NOT NULL,\n  object_key TEXT,\n  alt_text TEXT NOT NULL DEFAULT 'DropBeat Studio dance class',\n  visible INTEGER NOT NULL DEFAULT 1,\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS customers (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT,\n  phone TEXT NOT NULL UNIQUE,\n  email TEXT,\n  city TEXT,\n  preferred_role TEXT,\n  consent_whatsapp INTEGER NOT NULL DEFAULT 0,\n  consent_email INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS orders (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  order_id TEXT NOT NULL UNIQUE,\n  customer_id INTEGER,\n  customer_name TEXT,\n  customer_phone TEXT NOT NULL,\n  customer_email TEXT,\n  amount_paise INTEGER NOT NULL DEFAULT 0,\n  currency TEXT NOT NULL DEFAULT 'INR',\n  status TEXT NOT NULL DEFAULT 'new_checkout',\n  payment_status TEXT NOT NULL DEFAULT 'awaiting_payment',\n  gateway TEXT,\n  gateway_order_id TEXT,\n  gateway_payment_id TEXT,\n  gateway_subscription_id TEXT,\n  fallback_url TEXT,\n  failure_reason TEXT,\n  onboarding_status TEXT NOT NULL DEFAULT 'pending',\n  group_access_status TEXT NOT NULL DEFAULT 'pending',\n  internal_notes TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL\n)",
  "CREATE TABLE IF NOT EXISTS order_items (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  order_id INTEGER NOT NULL,\n  product_id INTEGER,\n  variant_id INTEGER,\n  product_name TEXT NOT NULL,\n  variant_name TEXT,\n  quantity INTEGER NOT NULL DEFAULT 1,\n  unit_amount_paise INTEGER NOT NULL DEFAULT 0,\n  first_payment_amount_paise INTEGER NOT NULL DEFAULT 0,\n  recurring_unit_amount_paise INTEGER NOT NULL DEFAULT 0,\n  coupon_recurring_scope TEXT NOT NULL DEFAULT '',\n  billing_months INTEGER NOT NULL DEFAULT 1,\n  horizon_years INTEGER NOT NULL DEFAULT 21,\n  total_count INTEGER NOT NULL DEFAULT 252,\n  setup_amount_paise INTEGER NOT NULL DEFAULT 0,\n  gateway_subscription_id TEXT,\n  checkout_url TEXT,\n  status TEXT NOT NULL DEFAULT 'created',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,\n  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL,\n  FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL\n)",
  `CREATE TABLE IF NOT EXISTS coupon_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'amount',
  discount_value INTEGER NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'cart',
  product_slug TEXT,
  min_cart_paise INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  member_limit INTEGER NOT NULL DEFAULT 0,
  billing_scope TEXT NOT NULL DEFAULT 'both',
  recurring_scope TEXT NOT NULL DEFAULT 'first',
  starts_at TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  `CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  city TEXT,
  plan_name TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'active',
  gateway TEXT,
  gateway_subscription_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  `CREATE TABLE IF NOT EXISTS refund_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  refund_id TEXT,
  provider TEXT NOT NULL DEFAULT 'manual',
  order_id TEXT,
  payment_id TEXT,
  subscription_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'requested',
  reason TEXT,
  mode TEXT,
  gateway_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  "CREATE TABLE IF NOT EXISTS payment_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  order_id TEXT,\n  gateway TEXT NOT NULL,\n  event_type TEXT NOT NULL,\n  payload_json TEXT NOT NULL,\n  verified INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS otp_challenges (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  phone TEXT NOT NULL,\n  otp_hash TEXT NOT NULL,\n  channel TEXT NOT NULL DEFAULT 'whatsapp',\n  attempts INTEGER NOT NULL DEFAULT 0,\n  consumed INTEGER NOT NULL DEFAULT 0,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS customer_sessions (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  phone TEXT NOT NULL,\n  token_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS blog_posts (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  title TEXT NOT NULL,\n  slug TEXT NOT NULL UNIQUE,\n  excerpt TEXT,\n  body_html TEXT NOT NULL,\n  cover_image_url TEXT,\n  status TEXT NOT NULL DEFAULT 'draft',\n  seo_title TEXT,\n  seo_description TEXT,\n  blogger_post_id TEXT,\n  blogger_post_url TEXT,\n  blogger_updated_at TEXT,\n  published_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS contact_leads (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT,\n  phone TEXT,\n  email TEXT,\n  message TEXT,\n  source TEXT NOT NULL DEFAULT 'website',\n  status TEXT NOT NULL DEFAULT 'new',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS admin_users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  email TEXT NOT NULL UNIQUE,\n  name TEXT,\n  password_hash TEXT NOT NULL,\n  salt TEXT NOT NULL,\n  role TEXT NOT NULL DEFAULT 'admin',\n  status TEXT NOT NULL DEFAULT 'active',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS admin_sessions (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  user_id INTEGER NOT NULL,\n  token_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE\n)",
  "CREATE TABLE IF NOT EXISTS admin_audit_logs (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  actor TEXT,\n  action TEXT NOT NULL,\n  entity_type TEXT,\n  entity_id TEXT,\n  before_json TEXT,\n  after_json TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "INSERT OR IGNORE INTO settings(key, value) VALUES\n('site_settings', json_object(\n  'siteName','DropBeat Dance Studio',\n  'tagline','Online and studio dance classes for every level',\n  'primaryColor','#4B55BE',\n  'accentColor','#A469A8',\n  'logoUrl','/assets/dropbeat-logo.svg',\n  'faviconUrl','/assets/dropbeat-logo.svg',\n  'whatsappNumber','9193919375',\n  'footerText','Website designed by Instautomate',\n  'googleAnalyticsMeasurementId','',\n  'googleTagManagerId','',\n  'metaPixelId','',\n  'searchConsoleVerification','',\n  'socials', json_array(\n    json_object('key','instagram','label','Instagram','url','','enabled',0),\n    json_object('key','facebook','label','Facebook','url','','enabled',0),\n    json_object('key','threads','label','Threads','url','','enabled',0),\n    json_object('key','youtube','label','YouTube','url','','enabled',0),\n    json_object('key','telegram','label','Telegram','url','','enabled',0),\n    json_object('key','snapchat','label','Snapchat','url','','enabled',0),\n    json_object('key','x','label','X','url','','enabled',0),\n    json_object('key','linkedin','label','LinkedIn','url','','enabled',0),\n    json_object('key','whatsapp','label','WhatsApp','url','https://wa.me/9193919375','enabled',1)\n  )\n))",
  "INSERT OR IGNORE INTO settings(key, value) VALUES('checkout_settings', json_object('paymentMode','subscription','subscriptionYears',21,'yearlyEnabled',0,'couponsEnabled',1,'yearlyOfferMonths',10))",
  "INSERT OR IGNORE INTO products(sku, name, slug, type, short_description, description, regular_price_paise, offer_price_paise, badge, features_json, eligibility, sort_order) VALUES\n('UC-STARTER','Online Dance Pass','online-dance-pass','subscription','For beginners who want flexible online dance classes.','Online class access, schedule updates and membership support.',39900,19900,'Online',json_array('Online dance classes','Class schedule updates','Beginner-friendly sessions','Order tracking access'),'Beginners and online learners',1),\n('UC-ACTOR','Studio Dance Membership','studio-dance-membership','subscription','For students who prefer regular instructor-led studio sessions.','Studio membership with class schedules, instructor updates and priority onboarding.',59900,34900,'Popular',json_array('Studio dance classes','Instructor-led sessions','Schedule updates','Priority onboarding'),'Students attending studio classes',2),\n('UC-SPECIAL','Hybrid Dance Membership','hybrid-dance-membership','subscription','For dancers who want both online and studio flexibility.','Hybrid access for selected online sessions and studio classes.',79900,49900,'Hybrid',json_array('Online + studio access','Flexible class options','Workshop updates','Upgrade available'),'Students who want hybrid access',3),\n('UC-ELITE','Private Coaching Circle','private-coaching-circle','subscription','For dancers who want focused coaching and premium access.','Premium membership for private coaching, selected workshops and advanced sessions where available.',119900,79900,'Premium',json_array('Private coaching updates','Premium workshop access','Advanced dancer focus','Priority class alerts'),'Intermediate to advanced dancers',4)",
  "INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)\nSELECT id, sku || '-MONTHLY', 'Monthly', 1, 21, 252, regular_price_paise, offer_price_paise FROM products",
  "INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)\nSELECT id, sku || '-QUARTERLY', '3 Months', 3, 21, 84, regular_price_paise * 3, offer_price_paise * 3 FROM products",
  "INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)\nSELECT id, sku || '-HALFYEAR', '6 Months', 6, 21, 42, regular_price_paise * 6, offer_price_paise * 6 FROM products",
  "INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)\nSELECT id, sku || '-NINEMONTH', '9 Months', 9, 21, 28, regular_price_paise * 9, offer_price_paise * 9 FROM products",
  "INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)\nSELECT id, sku || '-YEARLY', 'Yearly', 12, 21, 21, regular_price_paise * 12, offer_price_paise * 12 FROM products",
  "INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)\nSELECT id, sku || '-THREEYEAR', '3 Years', 36, 21, 7, regular_price_paise * 36, offer_price_paise * 36 FROM products",
  "INSERT OR IGNORE INTO page_placements(product_id, page_key, section_key, sort_order)\nSELECT p.id, 'home', 'featured', p.sort_order FROM products p WHERE (EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id) OR p.sku IN ('UC-STARTER','UC-ACTOR','UC-SPECIAL','UC-ELITE')) AND NOT EXISTS (SELECT 1 FROM page_placements pp WHERE pp.product_id=p.id AND pp.page_key='home')",
  "INSERT OR IGNORE INTO page_placements(product_id, page_key, section_key, sort_order)\nSELECT p.id, 'offers', 'memberships', p.sort_order FROM products p WHERE (EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id) OR p.sku IN ('UC-STARTER','UC-ACTOR','UC-SPECIAL','UC-ELITE')) AND NOT EXISTS (SELECT 1 FROM page_placements pp WHERE pp.product_id=p.id AND pp.page_key='offers')",
  "INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)\nSELECT id, 'seed/product-starter.svg', '/assets/product-starter.svg', 'Online Dance Pass image', 1, 1 FROM products WHERE sku='UC-STARTER'",
  "INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)\nSELECT id, 'seed/product-actor.svg', '/assets/product-actor.svg', 'Studio Dance Membership image', 1, 1 FROM products WHERE sku='UC-ACTOR'",
  "INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)\nSELECT id, 'seed/product-special.svg', '/assets/product-special.svg', 'Hybrid Dance Membership image', 1, 1 FROM products WHERE sku='UC-SPECIAL'",
  "INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)\nSELECT id, 'seed/product-elite.svg', '/assets/product-elite.svg', 'Private Coaching Circle image', 1, 1 FROM products WHERE sku='UC-ELITE'",
  "INSERT OR IGNORE INTO banners(title, subtitle, desktop_image_url, mobile_image_url, link_type, link_value, badge, visible, sort_order) VALUES\n('Online Dance Pass from \u20b9199/month','Learn from anywhere with online dance sessions and class updates.','/assets/banner-1.svg','/assets/banner-1.svg','product','online-dance-pass','Online',1,1),\n('Private Coaching for Focused Dancers','Focused coaching and premium workshop access for suitable levels.','/assets/banner-2.svg','/assets/banner-2.svg','product','private-coaching-circle','Premium',1,2),\n('Hybrid Dance Membership','Combine studio energy with the flexibility of online classes.','/assets/banner-3.svg','/assets/banner-3.svg','product','hybrid-dance-membership','Hybrid',1,3)",
  "CREATE TABLE IF NOT EXISTS blog_post_tags (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  post_id INTEGER NOT NULL,\n  tag TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  UNIQUE(post_id, tag),\n  FOREIGN KEY(post_id) REFERENCES blog_posts(id) ON DELETE CASCADE\n)",
  "CREATE TABLE IF NOT EXISTS success_stories (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  title TEXT,\n  url TEXT NOT NULL,\n  platform TEXT NOT NULL DEFAULT 'youtube',\n  thumbnail_url TEXT,\n  status TEXT NOT NULL DEFAULT 'active',\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS admin_email_change_requests (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  admin_user_id INTEGER NOT NULL,\n  new_email TEXT NOT NULL,\n  code_hash TEXT NOT NULL,\n  expires_at TEXT NOT NULL,\n  consumed INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY(admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE\n)",
  "CREATE TABLE IF NOT EXISTS visitor_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  visitor_id TEXT NOT NULL,\n  path TEXT,\n  referrer TEXT,\n  source TEXT,\n  user_agent TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS admin_notification_log (\n  notification_key TEXT PRIMARY KEY,\n  event_type TEXT NOT NULL DEFAULT '',\n  email_status TEXT NOT NULL DEFAULT '',\n  whatsapp_status TEXT NOT NULL DEFAULT '',\n  error_text TEXT NOT NULL DEFAULT '',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS content_pages (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  page_key TEXT NOT NULL UNIQUE,\n  title TEXT NOT NULL,\n  body_text TEXT,\n  body_html TEXT NOT NULL,\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "CREATE TABLE IF NOT EXISTS faq_items (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  question TEXT NOT NULL,\n  answer_text TEXT,\n  answer_html TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'active',\n  sort_order INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)",
  "INSERT OR IGNORE INTO content_pages(page_key,title,body_text,body_html,sort_order) VALUES\n(\"about\",\"About DropBeat Dance Studio\",\"DropBeat Dance Studio is a dance institute offering online, studio and hybrid classes for beginners, enthusiasts and experienced dancers.\n\nStudents can choose membership plans, workshops and coaching options based on their level, preferred dance style and schedule. Class plans, prices, availability and offers are managed from the website admin panel.\n\nOur goal is to make dance learning easy to discover and simple to manage, whether you prefer learning from home or training at the studio. Class schedules, instructors and availability may change, so the latest information shared by the studio will apply.\",\"<p>DropBeat Dance Studio is a dance institute offering online, studio and hybrid classes for beginners, enthusiasts and experienced dancers.</p><p>Students can choose membership plans, workshops and coaching options based on their level, preferred dance style and schedule. Class plans, prices, availability and offers are managed from the website admin panel.</p><p>Our goal is to make dance learning easy to discover and simple to manage, whether you prefer learning from home or training at the studio. Class schedules, instructors and availability may change, so the latest information shared by the studio will apply.</p>\",1),\n(\"contact\",\"Contact DropBeat Dance Studio\",\"Need help choosing a class, booking a trial, checking a membership, confirming a payment or understanding an online or studio schedule? Send your details through the contact form and the studio team will respond.\n\nYou can also use the order tracking page with your registered WhatsApp number when you need membership or payment status information.\",\"<p>Need help choosing a class, booking a trial, checking a membership, confirming a payment or understanding an online or studio schedule? Send your details through the contact form and the studio team will respond.</p><p>You can also use the order tracking page with your registered WhatsApp number when you need membership or payment status information.</p>\",2),\n(\"privacy\",\"Privacy Policy\",\"This Privacy Policy explains how DropBeat Dance Studio collects, uses and protects information provided through this website, trial-class enquiries, contact forms, checkout, order tracking and connected communication services.\n\nWe may collect information such as name, phone number, email address, class interests, membership and order information, payment status and support messages. This information is used to manage enquiries, memberships, class communication, payments, support and website operations.\n\nPayments are processed by enabled third-party payment gateways. We do not store full card numbers, CVV, UPI PINs or online-banking passwords. Payment references and status information may be stored for reconciliation and support.\n\nThe website may use analytics, advertising pixels, cookies and visitor logs when enabled by the administrator. These tools help measure website performance and marketing activity. We do not sell personal information. Limited information may be shared with payment, messaging, email, analytics or automation providers only where required to operate the service.\n\nYou may contact the studio to request correction of your contact information or assistance with communication preferences, subject to records that must be retained for payment, legal or operational purposes.\",\"<p>This Privacy Policy explains how DropBeat Dance Studio collects, uses and protects information provided through this website, trial-class enquiries, contact forms, checkout, order tracking and connected communication services.</p><p>We may collect information such as name, phone number, email address, class interests, membership and order information, payment status and support messages. This information is used to manage enquiries, memberships, class communication, payments, support and website operations.</p><p>Payments are processed by enabled third-party payment gateways. We do not store full card numbers, CVV, UPI PINs or online-banking passwords. Payment references and status information may be stored for reconciliation and support.</p><p>The website may use analytics, advertising pixels, cookies and visitor logs when enabled by the administrator. These tools help measure website performance and marketing activity. We do not sell personal information. Limited information may be shared with payment, messaging, email, analytics or automation providers only where required to operate the service.</p><p>You may contact the studio to request correction of your contact information or assistance with communication preferences, subject to records that must be retained for payment, legal or operational purposes.</p>\",3),\n(\"terms\",\"Terms & Conditions\",\"These Terms & Conditions apply to use of the DropBeat Dance Studio website, class memberships, workshops, online sessions, studio sessions, payments, order tracking and related services.\n\nMembership provides access to the class plan and benefits described at the time of purchase. Class schedules, instructors, venues, online links and workshop availability may change when operationally necessary. The latest schedule or communication issued by the studio will apply.\n\nStudents are responsible for choosing a class suitable for their age, experience and physical ability, following instructor guidance and providing accurate contact details. Participation in physical activity involves normal exercise-related risk; students should use appropriate judgment and seek professional advice where needed.\n\nPlans, pricing, offers, billing cycles, validity and access conditions may change for new purchases. Recurring payments and cancellations are also subject to the rules of the enabled payment gateway.\n\nMisuse of class links, paid materials, member-only information, abusive behaviour, spam or violation of studio rules may lead to suspension or cancellation of access.\",\"<p>These Terms &amp; Conditions apply to use of the DropBeat Dance Studio website, class memberships, workshops, online sessions, studio sessions, payments, order tracking and related services.</p><p>Membership provides access to the class plan and benefits described at the time of purchase. Class schedules, instructors, venues, online links and workshop availability may change when operationally necessary. The latest schedule or communication issued by the studio will apply.</p><p>Students are responsible for choosing a class suitable for their age, experience and physical ability, following instructor guidance and providing accurate contact details. Participation in physical activity involves normal exercise-related risk; students should use appropriate judgment and seek professional advice where needed.</p><p>Plans, pricing, offers, billing cycles, validity and access conditions may change for new purchases. Recurring payments and cancellations are also subject to the rules of the enabled payment gateway.</p><p>Misuse of class links, paid materials, member-only information, abusive behaviour, spam or violation of studio rules may lead to suspension or cancellation of access.</p>\",4),\n(\"refund\",\"Refund & Cancellation Policy\",\"This Refund & Cancellation Policy explains how membership cancellation, failed payments and refund requests are handled for DropBeat Dance Studio services.\n\nCancellation requests can be submitted using the contact details shown on the website. Please include the registered phone number, Order ID and reason so the studio can identify the membership correctly.\n\nA cancellation does not automatically create a refund. Refund eligibility depends on the selected plan, whether access or classes have already started, the reason for the request and the applicable payment-gateway rules. Duplicate payments or verified technical payment errors may be reviewed for refund.\n\nIf a payment fails but money is debited, reversal timing is generally controlled by the bank, card issuer, UPI provider or payment gateway. Approved refunds are returned through the applicable payment method and may take additional processing time.\",\"<p>This Refund &amp; Cancellation Policy explains how membership cancellation, failed payments and refund requests are handled for DropBeat Dance Studio services.</p><p>Cancellation requests can be submitted using the contact details shown on the website. Please include the registered phone number, Order ID and reason so the studio can identify the membership correctly.</p><p>A cancellation does not automatically create a refund. Refund eligibility depends on the selected plan, whether access or classes have already started, the reason for the request and the applicable payment-gateway rules. Duplicate payments or verified technical payment errors may be reviewed for refund.</p><p>If a payment fails but money is debited, reversal timing is generally controlled by the bank, card issuer, UPI provider or payment gateway. Approved refunds are returned through the applicable payment method and may take additional processing time.</p>\",5),\n(\"faq\",\"Frequently Asked Questions\",\"Find answers about online and studio dance classes, memberships, trial enquiries, payments, renewals, cancellations and order tracking. The administrator can edit this page and the FAQ items from the admin panel.\",\"<p>Find answers about online and studio dance classes, memberships, trial enquiries, payments, renewals, cancellations and order tracking. The administrator can edit this page and the FAQ items from the admin panel.</p>\",6),\n(\"404\",\"Page Not Found\",\"The page you are looking for could not be found. Please check the link, return to the home page, browse dance memberships or contact DropBeat Dance Studio for help.\",\"<p>The page you are looking for could not be found. Please check the link, return to the home page, browse dance memberships or contact DropBeat Dance Studio for help.</p>\",7)",
];

let schemaReadyInThisIsolate = false;
let schemaInitializationInThisIsolate = null;

function pageHtml(text='') { return String(text || '').split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('\n'); }
function portableInitialSql(statement=''){
  // Older SQLite builds accepted double-quoted string literals. Current D1 and
  // Node SQLite correctly reserve double quotes for identifiers, so normalize
  // only the legacy content-page seed before it is prepared.
  if(!statement.startsWith('INSERT OR IGNORE INTO content_pages'))return statement;
  return statement.replace(/"([^"]*)"/g,(_,value)=>`'${value.replace(/'/g,"''")}'`);
}
const DEFAULT_PAGE_TEXTS = {
  "about": { title: "About DropBeat Dance Studio", body: "DropBeat Dance Studio is a dance institute offering online, studio and hybrid classes for beginners, enthusiasts and experienced dancers.\n\nStudents can choose membership plans, workshops and coaching options based on their level, preferred dance style and schedule. Class plans, prices, availability and offers are managed from the website admin panel.\n\nOur goal is to make dance learning easy to discover and simple to manage, whether you prefer learning from home or training at the studio. Class schedules, instructors and availability may change, so the latest information shared by the studio will apply." },
  "contact": { title: "Contact DropBeat Dance Studio", body: "Need help choosing a class, booking a trial, checking a membership, confirming a payment or understanding an online or studio schedule? Send your details through the contact form and the studio team will respond.\n\nYou can also use the order tracking page with your registered WhatsApp number when you need membership or payment status information." },
  "privacy": { title: "Privacy Policy", body: "This Privacy Policy explains how DropBeat Dance Studio collects, uses and protects information provided through this website, trial-class enquiries, contact forms, checkout, order tracking and connected communication services.\n\nWe may collect information such as name, phone number, email address, class interests, membership and order information, payment status and support messages. This information is used to manage enquiries, memberships, class communication, payments, support and website operations.\n\nPayments are processed by enabled third-party payment gateways. We do not store full card numbers, CVV, UPI PINs or online-banking passwords. Payment references and status information may be stored for reconciliation and support.\n\nThe website may use analytics, advertising pixels, cookies and visitor logs when enabled by the administrator. These tools help measure website performance and marketing activity. We do not sell personal information. Limited information may be shared with payment, messaging, email, analytics or automation providers only where required to operate the service.\n\nYou may contact the studio to request correction of your contact information or assistance with communication preferences, subject to records that must be retained for payment, legal or operational purposes." },
  "terms": { title: "Terms & Conditions", body: "These Terms & Conditions apply to use of the DropBeat Dance Studio website, class memberships, workshops, online sessions, studio sessions, payments, order tracking and related services.\n\nMembership provides access to the class plan and benefits described at the time of purchase. Class schedules, instructors, venues, online links and workshop availability may change when operationally necessary. The latest schedule or communication issued by the studio will apply.\n\nStudents are responsible for choosing a class suitable for their age, experience and physical ability, following instructor guidance and providing accurate contact details. Participation in physical activity involves normal exercise-related risk; students should use appropriate judgment and seek professional advice where needed.\n\nPlans, pricing, offers, billing cycles, validity and access conditions may change for new purchases. Recurring payments and cancellations are also subject to the rules of the enabled payment gateway.\n\nMisuse of class links, paid materials, member-only information, abusive behaviour, spam or violation of studio rules may lead to suspension or cancellation of access." },
  "refund": { title: "Refund & Cancellation Policy", body: "This Refund & Cancellation Policy explains how membership cancellation, failed payments and refund requests are handled for DropBeat Dance Studio services.\n\nCancellation requests can be submitted using the contact details shown on the website. Please include the registered phone number, Order ID and reason so the studio can identify the membership correctly.\n\nA cancellation does not automatically create a refund. Refund eligibility depends on the selected plan, whether access or classes have already started, the reason for the request and the applicable payment-gateway rules. Duplicate payments or verified technical payment errors may be reviewed for refund.\n\nIf a payment fails but money is debited, reversal timing is generally controlled by the bank, card issuer, UPI provider or payment gateway. Approved refunds are returned through the applicable payment method and may take additional processing time." },
  "faq": { title: "Frequently Asked Questions", body: "Find answers about online and studio dance classes, memberships, trial enquiries, payments, renewals, cancellations and order tracking. The administrator can edit this page and the FAQ items from the admin panel." },
  "404": { title: "Page Not Found", body: "The page you are looking for could not be found. Please check the link, return to the home page, browse dance memberships or contact DropBeat Dance Studio for help." },
};
async function applyDefaultPageUpgrades(env) {
  for (const [key, data] of Object.entries(DEFAULT_PAGE_TEXTS)) {
    const row = await env.DB.prepare('SELECT body_text FROM content_pages WHERE page_key=?').bind(key).first().catch(()=>null);
    // Seed only missing pages. Never overwrite admin-edited page content merely
    // because it is shorter than a default template.
    if (!row) {
      await env.DB.prepare(`INSERT OR IGNORE INTO content_pages(page_key,title,body_text,body_html,sort_order,updated_at) VALUES(?,?,?,?,0,CURRENT_TIMESTAMP)`).bind(key, data.title, data.body, pageHtml(data.body)).run();
    }
  }
}


// V1.28 keeps the established full-schema marker compatible. V1.27 advanced
// this global marker for only four checkout columns; on every existing site
// that forced the entire legacy repair pass (hundreds of remote D1 operations)
// into an ordinary public or Login request. The four additive columns now have
// their own small persistent patch marker instead.
const PRE_V127_SCHEMA_VERSION = 'v16-96-contacts-notification-personalization-dropbeat-v1.04';
const SCHEMA_VERSION = 'v16-96-contacts-notification-personalization-dropbeat-v1.04-dropbeat-v1.27-checkout-runtime-repair';
const COMPATIBLE_SCHEMA_VERSIONS = new Set([PRE_V127_SCHEMA_VERSION, SCHEMA_VERSION]);
const CHECKOUT_PATCH_KEY = 'schema_patch_v1_28_checkout_columns';
const CHECKOUT_PATCH_VERSION = 'v1.28';

async function tableColumns(env, table) {
  const result = await withD1Retry(() => env.DB.prepare(`PRAGMA table_info(${table})`).all(), 1);
  return new Set((result?.results || []).map(column => String(column?.name || '')));
}

async function ensureV128CheckoutColumns(env) {
  const marker = await withD1Retry(() => env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(CHECKOUT_PATCH_KEY).first(), 1).catch(() => null);
  if (String(marker?.value || '') === CHECKOUT_PATCH_VERSION) return;

  const [productColumns, orderItemColumns] = await Promise.all([
    tableColumns(env, 'products'),
    tableColumns(env, 'order_items')
  ]);
  if (!productColumns.size || !orderItemColumns.size) {
    throw new Error('The checkout schema patch could not find the existing products and order_items tables.');
  }

  const additions = [
    [productColumns, 'billing_interval', "ALTER TABLE products ADD COLUMN billing_interval INTEGER"],
    [orderItemColumns, 'first_payment_amount_paise', "ALTER TABLE order_items ADD COLUMN first_payment_amount_paise INTEGER NOT NULL DEFAULT 0"],
    [orderItemColumns, 'recurring_unit_amount_paise', "ALTER TABLE order_items ADD COLUMN recurring_unit_amount_paise INTEGER NOT NULL DEFAULT 0"],
    [orderItemColumns, 'coupon_recurring_scope', "ALTER TABLE order_items ADD COLUMN coupon_recurring_scope TEXT NOT NULL DEFAULT ''"]
  ];
  for (const [columns, name, sql] of additions) {
    if (!columns.has(name)) await withD1Retry(() => env.DB.prepare(sql).run(), 1);
  }
  await withD1Retry(() => env.DB.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(CHECKOUT_PATCH_KEY, CHECKOUT_PATCH_VERSION).run(), 1);
}

async function writeSchemaReadyMarker(env) {
  await env.DB.prepare("INSERT OR REPLACE INTO settings(key, value, updated_at) VALUES('schema_ready', ?, CURRENT_TIMESTAMP)").bind(JSON.stringify({ version: SCHEMA_VERSION, appliedAt: new Date().toISOString() })).run();
}

export async function ensureSchema(env) {
  if (!env?.DB || schemaReadyInThisIsolate) return;
  // One cold isolate can receive several API requests together. Share the same
  // initialization promise so those requests cannot launch duplicate repairs.
  if (schemaInitializationInThisIsolate) return schemaInitializationInThisIsolate;
  const task = ensureSchemaOnce(env);
  schemaInitializationInThisIsolate = task;
  try {
    await task;
  } finally {
    if (schemaInitializationInThisIsolate === task) schemaInitializationInThisIsolate = null;
  }
}

async function ensureSchemaOnce(env) {

  // Keep the auto-create behavior, but avoid replaying the entire schema on every
  // new Pages Functions isolate. The previous version did dozens of D1 writes on
  // the first public API request of each cold isolate, which could visibly delay
  // page data and banner images.
  await withD1Retry(() => env.DB.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run());
  const ready = await withD1Retry(() => env.DB.prepare("SELECT value FROM settings WHERE key='schema_ready'").first()).catch(() => null);
  let readyVersion = '';
  if (ready?.value) {
    try {
      const parsed = JSON.parse(ready.value);
      readyVersion = String(parsed?.version || '');
    } catch (_) {}
  }

  if (COMPATIBLE_SCHEMA_VERSIONS.has(readyVersion)) {
    await ensureV128CheckoutColumns(env);
    if (readyVersion !== SCHEMA_VERSION) await writeSchemaReadyMarker(env);
    schemaReadyInThisIsolate = true;
    return;
  }

  await ensureMediaTable(env);
  for (const statement of INITIAL_SCHEMA) {
    const trimmed = String(statement || '').trim();
    if (!trimmed) continue;
    await env.DB.prepare(portableInitialSql(trimmed)).run();
  }
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  // DropBeat V1.04: the welcome-panel gallery is additive. The guarded story
  // columns also repair very early installs whose success_stories table was
  // created before the complete schema shipped.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS studio_gallery_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    object_key TEXT,
    alt_text TEXT NOT NULL DEFAULT 'DropBeat Studio dance class',
    visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN title TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN url TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN platform TEXT NOT NULL DEFAULT 'youtube'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN thumbnail_url TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN status TEXT NOT NULL DEFAULT 'active'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN created_at TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE success_stories ADD COLUMN updated_at TEXT").run(); } catch (_) {}
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_studio_gallery_visible_sort ON studio_gallery_images(visible,sort_order,id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_success_stories_status_sort ON success_stories(status,sort_order,id)").run().catch(()=>{});
  // V16.96: consent-aware operational contact context. These fields are added by
  // the normal self-healing schema path, so replacing/deploying the code does not
  // require an administrator to run a separate D1 migration command.
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN ip_address TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN device_id TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN analytics_consent INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN ads_consent INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN country_code TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN city TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE visitor_events ADD COLUMN region_code TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE refund_requests ADD COLUMN gateway_response_json TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE refund_requests ADD COLUMN subscription_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN visitor_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN source_detail TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN follow_up_date TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN next_action TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN last_contact_method TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN outcome TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN notes TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN purchase_type TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN custom_subscription_link TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN order_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN gateway_subscription_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN gateway_payment_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN sale_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN last_contacted_at TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN updated_at TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN date_of_birth TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN location TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN interests TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("UPDATE contact_leads SET updated_at=COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE refund_requests ADD COLUMN gross_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE refund_requests ADD COLUMN gateway_fee_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE refund_requests ADD COLUMN platform_fee_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE refund_requests ADD COLUMN platform_fee_percent REAL NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN payment_mode TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN gateway_attempts_json TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN email_notice_sent INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN original_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN discount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN coupon_code TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN website_phone TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN razorpay_phone TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN order_stage TEXT NOT NULL DEFAULT 'new'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN refund_status TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'subscription'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN offer_price_enabled INTEGER NOT NULL DEFAULT 1").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN trial_enabled INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN trial_amount_paise INTEGER NOT NULL DEFAULT 100").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN trial_value INTEGER NOT NULL DEFAULT 7").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN trial_unit TEXT NOT NULL DEFAULT 'days'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'monthly'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN billing_interval INTEGER").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN offer_discount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN coupon_discount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN gateway TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN gateway_order_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN payment_mode TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN original_unit_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN discount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN coupon_code TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN first_payment_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN recurring_unit_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN coupon_recurring_scope TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE orders ADD COLUMN tax_snapshot_json TEXT NOT NULL DEFAULT '{}'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE order_items ADD COLUMN tax_snapshot_json TEXT NOT NULL DEFAULT '{}'").run(); } catch (_) {}
  // V16.1: V16.0 introduced receipt tax columns but accidentally kept the
  // previous schema version marker. These guarded ALTERs make the upgrade
  // self-healing for databases that already reported the V15.9 schema as ready.
  try { await env.DB.prepare("ALTER TABLE payment_receipts ADD COLUMN base_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE payment_receipts ADD COLUMN gst_amount_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE payment_receipts ADD COLUMN service_charge_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE payment_receipts ADD COLUMN other_tax_paise INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE payment_receipts ADD COLUMN tax_snapshot_json TEXT NOT NULL DEFAULT '{}'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE blog_posts ADD COLUMN ads_json TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE blog_posts ADD COLUMN auto_ads_enabled INTEGER NOT NULL DEFAULT 1").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE blog_posts ADD COLUMN blogger_post_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE blog_posts ADD COLUMN blogger_post_url TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE blog_posts ADD COLUMN blogger_updated_at TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE blog_posts ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  await env.DB.prepare("UPDATE blog_posts SET auto_ads_enabled=0, ads_json=COALESCE(ads_json,'[]') WHERE blogger_post_id IS NOT NULL AND (ads_json IS NULL OR trim(ads_json)='')").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured,status,published_at)").run().catch(()=>{});

  // Unified client CRM additions. These are additive and keep all existing tables/logic intact.
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN interest_level TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN assigned_to TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN price_discussed TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    followup_date TEXT NOT NULL,
    followup_type TEXT,
    contacted_person_name TEXT,
    outcome TEXT,
    next_follow_up_date TEXT,
    next_action TEXT,
    done_by TEXT,
    discussion TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS manual_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    order_id TEXT,
    payment_date TEXT NOT NULL,
    payment_type TEXT,
    payment_mode TEXT,
    amount_paise INTEGER NOT NULL DEFAULT 0,
    next_payment_due_date TEXT,
    collected_by TEXT,
    transaction_reference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'recorded',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS visitor_cart_state (
    visitor_id TEXT PRIMARY KEY,
    service_count INTEGER NOT NULL DEFAULT 0,
    amount_paise INTEGER NOT NULL DEFAULT 0,
    items_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_followups_lead_date ON lead_followups(lead_id, followup_date)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_manual_payments_lead ON manual_payments(lead_id, payment_date)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_manual_payments_date_status ON manual_payments(payment_date, status, order_id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_manual_payments_ist_day_status ON manual_payments(date(NULLIF(payment_date,''),'+330 minutes'), status)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_manual_payments_order_status ON manual_payments(order_id, status)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id, id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_subscribers_status_updated ON subscribers(subscription_status, updated_at DESC)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_visitor_events_visitor_path ON visitor_events(visitor_id, path)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_visitor_events_contact_context ON visitor_events(visitor_id,created_at DESC)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_visitor_events_visitor_id_desc ON visitor_events(visitor_id,id DESC)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_visitor_events_source_visitor ON visitor_events(source,visitor_id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_contact_leads_visitor_updated ON contact_leads(visitor_id,updated_at DESC,id DESC)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_admin_notification_created ON admin_notification_log(created_at)").run().catch(()=>{});

  // Submit Profile + four-stage identity dedupe additions.
  // V7 About Us page media metadata.
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN cover_image_url TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN cover_image_alt TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}

  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN age INTEGER").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN gender TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN instagram_id TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN current_occupation TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN experience_level TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN projects_count INTEGER").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN future_goal TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN role_interest TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN profile_message TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN profile_submitted INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN profile_updated_at TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN profile_photo_links TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE contact_leads ADD COLUMN profile_video_links TEXT NOT NULL DEFAULT '[]'").run(); } catch (_) {}
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_field_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    is_pending INTEGER NOT NULL DEFAULT 0,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id, field_name, normalized_value),
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    submission_type TEXT NOT NULL DEFAULT 'contact',
    visitor_id TEXT,
    source_detail TEXT,
    message TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'recorded',
    resolved_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  try { await env.DB.prepare("ALTER TABLE lead_submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'recorded'").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE lead_submissions ADD COLUMN resolved_at TEXT").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE lead_submissions ADD COLUMN updated_at TEXT").run(); } catch (_) {}
  await env.DB.prepare("UPDATE lead_submissions SET status='new', updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP) WHERE submission_type='contact' AND lower(COALESCE(status,'recorded'))='recorded'").run().catch(()=>{});
  await env.DB.prepare("UPDATE lead_submissions SET updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP) WHERE updated_at IS NULL").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_lead_candidates_lookup ON lead_field_candidates(field_name, normalized_value)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_lead_candidates_pending ON lead_field_candidates(lead_id, is_pending)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_lead_submissions_lead ON lead_submissions(lead_id, created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_lead_submissions_status ON lead_submissions(submission_type,status,created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_blog_posts_blogger_id ON blog_posts(blogger_post_id)").run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS blog_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    source TEXT NOT NULL DEFAULT 'name',
    visitor_id TEXT NOT NULL DEFAULT '',
    ip_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_blog_comments_post_status ON blog_comments(post_id,status,created_at)").run().catch(()=>{});
  // V15.4: comments belong to remote SEO/Blogger post IDs. Audition posts themselves
  // remain in the connected SEO and are not copied into D1.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS seo_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seo_post_id TEXT NOT NULL,
    post_slug TEXT NOT NULL,
    post_title TEXT NOT NULL DEFAULT '',
    post_image TEXT NOT NULL DEFAULT '',
    parent_comment_id INTEGER,
    lead_id INTEGER,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL DEFAULT '',
    comment_text TEXT NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    is_admin INTEGER NOT NULL DEFAULT 0,
    workflow_status TEXT NOT NULL DEFAULT 'new',
    visibility TEXT NOT NULL DEFAULT 'published',
    visitor_id TEXT NOT NULL DEFAULT '',
    ip_hash TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(parent_comment_id) REFERENCES seo_comments(id) ON DELETE CASCADE,
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_seo_comments_post ON seo_comments(seo_post_id,visibility,created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_seo_comments_workflow ON seo_comments(is_admin,workflow_status,created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_seo_comments_lead ON seo_comments(lead_id,created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_contact_leads_instagram ON contact_leads(instagram_id)").run().catch(()=>{});

  // One-time customer records are additive. Checkout-paid one-time orders remain in orders;
  // this table is only for optional manual records created by an admin.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS one_time_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    amount_paise INTEGER NOT NULL DEFAULT 0,
    purpose TEXT,
    gateway TEXT,
    transaction_reference TEXT,
    notes TEXT,
    payment_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_one_time_users_phone ON one_time_users(phone,created_at)").run().catch(()=>{});

  // Social media webhook intake is additive. It stores delivery/audit metadata while
  // the actual contact information continues to use the existing contact_leads CRM.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    external_lead_id TEXT,
    lead_id INTEGER,
    event_type TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'received',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, external_event_id),
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_webhook_events_status ON social_webhook_events(platform,status,created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_webhook_events_lead ON social_webhook_events(lead_id,created_at)").run().catch(()=>{});

  // Favorites and Google Maps/Reviews are additive. Secrets stay in settings; only cached public review data is stored here.
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_contact_leads_favorite ON contact_leads(is_favorite,updated_at)").run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    document_type TEXT NOT NULL DEFAULT 'invoice',
    document_number TEXT,
    document_date TEXT,
    period_from TEXT,
    period_to TEXT,
    delivery_channel TEXT NOT NULL DEFAULT 'download',
    recipient TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'sent',
    provider TEXT,
    provider_reference TEXT,
    amount_paise INTEGER NOT NULL DEFAULT 0,
    transaction_reference TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_client_document_history_lead_type ON client_document_history(lead_id,document_type,created_at)").run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS service_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL UNIQUE,
    lead_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    request_type TEXT NOT NULL,
    request_label TEXT NOT NULL,
    pause_months INTEGER,
    pause_until TEXT,
    statement_period TEXT,
    statement_from TEXT,
    statement_to TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT NOT NULL DEFAULT 'website',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE SET NULL
  )`).run().catch(()=>{});
  // New requests remain New until the admin opens/starts them. Earlier records
  // already moved to In Progress are preserved without a recurring rewrite.
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_service_requests_status_created ON service_requests(status,created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_service_requests_lead_created ON service_requests(lead_id,created_at)").run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS google_review_cache (
    cache_key TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'places',
    reviews_json TEXT NOT NULL DEFAULT '[]',
    business_name TEXT,
    average_rating REAL,
    total_review_count INTEGER NOT NULL DEFAULT 0,
    maps_url TEXT,
    fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});

  // V15.9: actual money-received ledger. Orders keep the commercial/recurring
  // amount; this ledger stores only transactions that a gateway actually confirmed.
  await ensurePaymentReceiptsTable(env);

  // V15.5: fast, dashboard-only cache for Subscription Overview.
  // This cache is never used by checkout, orders, refunds or customer billing logic.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS subscription_overview_cache (
    gateway TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '',
    created_at_epoch INTEGER NOT NULL DEFAULT 0,
    ended_at_epoch INTEGER NOT NULL DEFAULT 0,
    charge_at_epoch INTEGER NOT NULL DEFAULT 0,
    row_json TEXT NOT NULL DEFAULT '{}',
    refresh_token TEXT NOT NULL DEFAULT '',
    last_refreshed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(gateway, subscription_id)
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS subscription_overview_activity_cache (
    activity_key TEXT PRIMARY KEY,
    gateway TEXT NOT NULL,
    subscription_id TEXT NOT NULL DEFAULT '',
    activity_type TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_epoch INTEGER NOT NULL DEFAULT 0,
    row_json TEXT NOT NULL DEFAULT '{}',
    last_refreshed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_subscription_overview_cache_status ON subscription_overview_cache(gateway,status,created_at_epoch)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_subscription_overview_cache_charge ON subscription_overview_cache(gateway,charge_at_epoch)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_subscription_overview_lookup ON subscription_overview_cache(subscription_id,gateway,last_refreshed_at DESC)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_subscription_overview_activity_range ON subscription_overview_activity_cache(gateway,activity_type,event_date)").run().catch(()=>{});

  // V15.7: admin-only Auditions index. Blogger/SEO is the live/draft/scheduled source;
  // Deleted rows are D1-only snapshots after their Blogger resources are permanently removed.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audition_post_cache (
    blog_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    remote_status TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL DEFAULT '',
    updated_at_remote TEXT NOT NULL DEFAULT '',
    published_at_remote TEXT NOT NULL DEFAULT '',
    row_json TEXT NOT NULL DEFAULT '{}',
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sync_generation INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(blog_id, post_id)
  )`).run().catch(()=>{});
  try { await env.DB.prepare("ALTER TABLE audition_post_cache ADD COLUMN sync_generation INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS audition_sync_state (
    blog_id TEXT PRIMARY KEY,
    blog_name TEXT NOT NULL DEFAULT '',
    initial_sync_complete INTEGER NOT NULL DEFAULT 0,
    live_complete INTEGER NOT NULL DEFAULT 0,
    draft_complete INTEGER NOT NULL DEFAULT 0,
    scheduled_complete INTEGER NOT NULL DEFAULT 0,
    live_page_token TEXT NOT NULL DEFAULT '',
    draft_page_token TEXT NOT NULL DEFAULT '',
    scheduled_page_token TEXT NOT NULL DEFAULT '',
    last_remote_updated_at TEXT NOT NULL DEFAULT '',
    last_synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cached_count INTEGER NOT NULL DEFAULT 0,
    sync_version INTEGER NOT NULL DEFAULT 0,
    sync_generation INTEGER NOT NULL DEFAULT 0
  )`).run().catch(()=>{});
  try { await env.DB.prepare("ALTER TABLE audition_sync_state ADD COLUMN scheduled_complete INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE audition_sync_state ADD COLUMN scheduled_page_token TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE audition_sync_state ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE audition_sync_state ADD COLUMN sync_generation INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_audition_post_cache_status ON audition_post_cache(blog_id,status,updated_at_remote)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_audition_post_cache_updated ON audition_post_cache(blog_id,updated_at_remote)").run().catch(()=>{});

  // Normalize only the user-facing comment/inquiry wording. Existing lead identities,
  // duplicate matching and CRM candidate logic stay unchanged.
  await env.DB.prepare("UPDATE contact_leads SET source='article_comment' WHERE lower(COALESCE(source,''))='blog_comment'").run().catch(()=>{});
  await env.DB.prepare("UPDATE contact_leads SET message=replace(message,'Blog comment on ','Comment on article ') WHERE message LIKE 'Blog comment on %'").run().catch(()=>{});
  await env.DB.prepare("UPDATE lead_submissions SET source_detail='article_comment' WHERE lower(COALESCE(source_detail,''))='blog_comment'").run().catch(()=>{});
  await env.DB.prepare("UPDATE lead_submissions SET message=replace(message,'Blog comment on ','Comment on article ') WHERE message LIKE 'Blog comment on %'").run().catch(()=>{});
  await env.DB.prepare("UPDATE lead_submissions SET status='new',updated_at=COALESCE(updated_at,created_at,CURRENT_TIMESTAMP) WHERE submission_type='comment' AND lower(COALESCE(status,'recorded'))='recorded'").run().catch(()=>{});

  await env.DB.prepare("DELETE FROM banners WHERE id NOT IN (SELECT MIN(id) FROM banners GROUP BY title, link_value, desktop_image_url)").run().catch(() => {});
  await env.DB.prepare("DELETE FROM success_stories WHERE id NOT IN (SELECT MIN(id) FROM success_stories GROUP BY lower(coalesce(title,'')), lower(coalesce(url,'')), lower(coalesce(platform,'')), lower(coalesce(thumbnail_url,'')))").run().catch(() => {});
  await env.DB.prepare(`INSERT INTO faq_items(question,answer_text,answer_html,status,sort_order)
    SELECT ?,?,?,'active',? WHERE NOT EXISTS (SELECT 1 FROM faq_items WHERE lower(trim(question))=lower(trim(?)))`).bind(
      'How can I cancel, pause or restart my subscription, or request an invoice or statement?',
      'Open Requests from the Policies section in the website footer. Enter your registered contact details, choose Cancellation, Pause Subscription, Restart Subscription, Invoice or Payment Statement, add any required period/details and submit. The team will review the request and process it according to the current payment-gateway and plan rules.',
      '<p>Open <strong>Requests</strong> from the Policies section in the website footer. Enter your registered contact details, choose <strong>Cancellation</strong>, <strong>Pause Subscription</strong>, <strong>Restart Subscription</strong>, <strong>Invoice</strong> or <strong>Payment Statement</strong>, add any required period/details and submit. The team will review the request and process it according to the current payment-gateway and plan rules.</p>',
      95,
      'How can I cancel, pause or restart my subscription, or request an invoice or statement?'
    ).run().catch(()=>{});
  await env.DB.prepare("DELETE FROM faq_items WHERE id NOT IN (SELECT MIN(id) FROM faq_items GROUP BY lower(trim(coalesce(question,''))), lower(trim(coalesce(answer_text,''))))").run().catch(() => {});

  // Backfill already-verified gateway events once so previously collected trial/setup
  // payments (for example ₹1 authentication payments) are available immediately.
  await backfillPaymentReceipts(env,{limit:10000}).catch(()=>{});
  // A subscription that is only authenticated has not yet paid its recurring plan
  // amount. Keep that lifecycle separate from the actual upfront receipt.
  await env.DB.prepare(`UPDATE orders SET payment_status='authenticated',updated_at=CURRENT_TIMESTAMP
    WHERE lower(COALESCE(status,''))='authenticated' AND lower(COALESCE(payment_mode,'subscription'))<>'one_time'
      AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id=orders.id AND COALESCE(oi.setup_amount_paise,0)>0)`).run().catch(()=>{});

  // V16.9: payment-failure recovery email state. This is additive and does not
  // change payment, subscription, refund, or CRM matching logic.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS payment_recovery_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL DEFAULT '',
    failure_reason TEXT NOT NULL DEFAULT '',
    failure_reference TEXT NOT NULL DEFAULT '',
    attempt_amount_paise INTEGER NOT NULL DEFAULT 0,
    last_failure_fingerprint TEXT NOT NULL DEFAULT '',
    last_failure_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    immediate_sent_at TEXT NOT NULL DEFAULT '',
    reminder2_due_at TEXT NOT NULL DEFAULT '',
    reminder2_sent_at TEXT NOT NULL DEFAULT '',
    reminder3_due_at TEXT NOT NULL DEFAULT '',
    reminder3_sent_at TEXT NOT NULL DEFAULT '',
    reminder_level INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    resolved_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_payment_recovery_due ON payment_recovery_emails(status,reminder2_due_at,reminder3_due_at)').run().catch(()=>{});

  // V16.7: outbound article distribution log. This prevents duplicate Threads/Pinterest
  // posts when an admin refreshes or republishes the same Blogger-backed article.
  // Search Console sitemap submissions remain intentionally repeatable.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_publish_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    article_key TEXT NOT NULL,
    article_url TEXT NOT NULL DEFAULT '',
    external_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, article_key)
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_publish_log_status ON social_publish_log(platform,status,updated_at)").run().catch(()=>{});

  // V16.11: unified remote social comments/reviews cache. Incoming website article
  // comments remain in seo_comments; this table stores only remote platform items.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    external_comment_id TEXT NOT NULL,
    external_post_id TEXT NOT NULL DEFAULT '',
    post_title TEXT NOT NULL DEFAULT '',
    post_url TEXT NOT NULL DEFAULT '',
    post_image TEXT NOT NULL DEFAULT '',
    commenter_id TEXT NOT NULL DEFAULT '',
    commenter_name TEXT NOT NULL DEFAULT '',
    commenter_username TEXT NOT NULL DEFAULT '',
    commenter_profile_url TEXT NOT NULL DEFAULT '',
    comment_text TEXT NOT NULL DEFAULT '',
    remote_created_at TEXT NOT NULL DEFAULT '',
    workflow_status TEXT NOT NULL DEFAULT 'new',
    remote_state TEXT NOT NULL DEFAULT '',
    is_spam INTEGER NOT NULL DEFAULT 0,
    private_message_sent_at TEXT NOT NULL DEFAULT '',
    raw_json TEXT NOT NULL DEFAULT '{}',
    last_synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, external_comment_id)
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_comments_platform_status ON social_comments(platform,workflow_status,remote_created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(platform,external_post_id)").run().catch(()=>{});

  // V16.15: additive social-comment threading/action state. These guarded ALTERs
  // preserve existing V16.11 comment data while allowing remote replies and
  // moderation state to stay attached to the original incoming comment row.
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN post_published_at TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN parent_comment_id TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN admin_reply_text TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN admin_reply_at TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN admin_reply_author TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN admin_reply_external_id TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN remote_liked INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN remote_hidden INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN remote_deleted INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  // V16.16: records whether the admin response was a nested reply or a normal public post comment.
  try { await env.DB.prepare("ALTER TABLE social_comments ADD COLUMN admin_reply_mode TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_comments_parent ON social_comments(platform,parent_comment_id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_comments_visibility ON social_comments(platform,remote_hidden,is_spam,remote_deleted,workflow_status)").run().catch(()=>{});

  // V16.27: keep the website crop separate from the original/master image used for social status publishing.
  // Only URLs/metadata are stored in D1; image bytes continue to live outside Cloudflare D1.
  try { await env.DB.prepare("ALTER TABLE product_images ADD COLUMN source_url TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE product_images ADD COLUMN source_public_id TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE product_images ADD COLUMN website_crop_url TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE product_images ADD COLUMN website_crop_updated_at TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}

  // V16.34: independently controlled 16:9 crop for Offer Details. Only the URL is stored in D1.
  try { await env.DB.prepare("ALTER TABLE product_images ADD COLUMN detail_crop_url TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE product_images ADD COLUMN detail_crop_updated_at TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}

  // V16.34: admin-created website pages, navigation placement and optional product-display metadata.
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN page_name TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  await env.DB.prepare("UPDATE content_pages SET page_name=title WHERE is_custom=1 AND trim(COALESCE(page_name,''))=''").run().catch(()=>{});
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN slug TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN nav_visible INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN nav_parent TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN nav_sort_order INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN product_display_enabled INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN page_badge TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN section_title TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN short_description TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN empty_title TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN empty_text TEXT NOT NULL DEFAULT ''").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE content_pages ADD COLUMN image_enabled INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_content_pages_custom_nav ON content_pages(is_custom,nav_visible,nav_parent,nav_sort_order)").run().catch(()=>{});

  // V16.24: product-image social status/story campaigns. Product image bytes are not stored here; only the normalized public image URL and schedule metadata are saved.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_status_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    product_image_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'once',
    starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at TEXT NOT NULL DEFAULT '',
    next_run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_run_at TEXT NOT NULL DEFAULT '',
    run_count INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    last_result_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_status_due ON social_status_campaigns(active,next_run_at)").run().catch(()=>{});

  // V16.48: manual social post composer and scheduler. This is additive and
  // deliberately separate from the existing Audition auto-publishing tables.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_type TEXT NOT NULL DEFAULT 'text',
    video_mode TEXT NOT NULL DEFAULT '',
    media_kind TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    alt_text TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    first_comment_enabled INTEGER NOT NULL DEFAULT 0,
    first_comment_text TEXT NOT NULL DEFAULT '',
    media_url TEXT NOT NULL DEFAULT '',
    media_drive_file_id TEXT NOT NULL DEFAULT '',
    media_name TEXT NOT NULL DEFAULT '',
    media_mime TEXT NOT NULL DEFAULT '',
    media_items_json TEXT NOT NULL DEFAULT '[]',
    poll_json TEXT NOT NULL DEFAULT '{}',
    scheduled_at TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    publish_summary TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT NOT NULL DEFAULT ''
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_post_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    external_id TEXT NOT NULL DEFAULT '',
    external_url TEXT NOT NULL DEFAULT '',
    error_text TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    published_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, platform),
    FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_posts_schedule ON social_posts(status,scheduled_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_post_targets_post ON social_post_targets(post_id,status)").run().catch(()=>{});
  await env.DB.prepare("ALTER TABLE social_posts ADD COLUMN media_items_json TEXT NOT NULL DEFAULT '[]'").run().catch(()=>{});
  await env.DB.prepare("ALTER TABLE social_posts ADD COLUMN poll_json TEXT NOT NULL DEFAULT '{}'").run().catch(()=>{});

  // V16.75: social identity links and scheduled lead nurturing. Only contact
  // data, schedule state and delivery receipts are stored in D1.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_identity_links (
    platform TEXT NOT NULL, external_id TEXT NOT NULL, lead_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(platform,external_id), FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lead_identity_links_lead ON lead_identity_links(lead_id)').run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_nurture_flows (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 0,
    source_filter_json TEXT NOT NULL DEFAULT '[]', stop_on_purchase INTEGER NOT NULL DEFAULT 1,
    repeat_enabled INTEGER NOT NULL DEFAULT 1, repeat_interval_minutes INTEGER NOT NULL DEFAULT 1440,
    steps_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_nurture_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, flow_id INTEGER NOT NULL, lead_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', next_step_index INTEGER NOT NULL DEFAULT 0,
    cycle_no INTEGER NOT NULL DEFAULT 0,
    next_run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_error TEXT NOT NULL DEFAULT '',
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(flow_id,lead_id),
    FOREIGN KEY(flow_id) REFERENCES lead_nurture_flows(id) ON DELETE CASCADE,
    FOREIGN KEY(lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lead_nurture_due ON lead_nurture_enrollments(status,next_run_at,id)').run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lead_nurture_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, enrollment_id INTEGER NOT NULL, flow_id INTEGER NOT NULL,
    lead_id INTEGER NOT NULL, step_index INTEGER NOT NULL DEFAULT 0, cycle_no INTEGER NOT NULL DEFAULT 0, channel TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '', provider_id TEXT NOT NULL DEFAULT '', error_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(enrollment_id,step_index,cycle_no),
    FOREIGN KEY(enrollment_id) REFERENCES lead_nurture_enrollments(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare('ALTER TABLE lead_nurture_flows ADD COLUMN repeat_enabled INTEGER NOT NULL DEFAULT 1').run().catch(()=>{});
  await env.DB.prepare('ALTER TABLE lead_nurture_flows ADD COLUMN repeat_interval_minutes INTEGER NOT NULL DEFAULT 1440').run().catch(()=>{});
  await env.DB.prepare('ALTER TABLE lead_nurture_enrollments ADD COLUMN cycle_no INTEGER NOT NULL DEFAULT 0').run().catch(()=>{});
  await env.DB.prepare('ALTER TABLE lead_nurture_runs ADD COLUMN cycle_no INTEGER NOT NULL DEFAULT 0').run().catch(()=>{});

  // V16.56: unified DM inbox. Existing comment/message ingestion remains intact;
  // these tables add a conversation-centric view without replacing older workflow data.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_dm_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    external_conversation_id TEXT NOT NULL,
    participant_id TEXT NOT NULL DEFAULT '',
    participant_name TEXT NOT NULL DEFAULT '',
    participant_username TEXT NOT NULL DEFAULT '',
    participant_profile_url TEXT NOT NULL DEFAULT '',
    participant_avatar_url TEXT NOT NULL DEFAULT '',
    folder TEXT NOT NULL DEFAULT 'inbox',
    last_message_text TEXT NOT NULL DEFAULT '',
    last_message_at TEXT NOT NULL DEFAULT '',
    unread_count INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform,external_conversation_id)
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_dm_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    external_message_id TEXT NOT NULL,
    sender_id TEXT NOT NULL DEFAULT '',
    sender_name TEXT NOT NULL DEFAULT '',
    direction TEXT NOT NULL DEFAULT 'inbound',
    message_text TEXT NOT NULL DEFAULT '',
    attachment_url TEXT NOT NULL DEFAULT '',
    attachment_type TEXT NOT NULL DEFAULT '',
    sent_at TEXT NOT NULL DEFAULT '',
    raw_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform,external_message_id),
    FOREIGN KEY(conversation_id) REFERENCES social_dm_conversations(id) ON DELETE CASCADE
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_dm_conversations_activity ON social_dm_conversations(last_message_at DESC,id DESC)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_dm_conversations_unread ON social_dm_conversations(unread_count,last_message_at DESC)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_dm_messages_conversation ON social_dm_messages(conversation_id,sent_at,id)").run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_dm_sync_state (
    platform TEXT PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT '',
    last_synced_at TEXT NOT NULL DEFAULT '',
    last_success_at TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(()=>{});

  // V16.25: lightweight plan-interest events from the public Offer Details page.
  // The visitor id lets this anonymous signal join the Client Details timeline later
  // when the same browser submits a profile/contact form.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS product_interest_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    product_slug TEXT NOT NULL DEFAULT '',
    source_path TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(visitor_id, product_id)
  )`).run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_product_interest_visitor ON product_interest_events(visitor_id,updated_at)").run().catch(()=>{});

  // V16.29: optional real capacity for truthful public availability messages.
  // 0 means unlimited / no scarcity claim. Paid order quantities are used to calculate remaining spots.
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN spot_limit INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN filling_fast_limit INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}
  try { await env.DB.prepare("ALTER TABLE products ADD COLUMN low_spot_limit INTEGER NOT NULL DEFAULT 0").run(); } catch (_) {}

  // V16.28: a product may be displayed only once per page. Older imports could create
  // a second visible row for the same product/page under a different section key.
  // Keep the most recently updated visible placement and hide the rest. Public queries
  // also de-duplicate defensively, so existing client sites never render the same plan twice.
  await env.DB.prepare(`UPDATE page_placements SET visible=0,updated_at=CURRENT_TIMESTAMP WHERE id IN (
    SELECT id FROM (
      SELECT id,ROW_NUMBER() OVER(
        PARTITION BY product_id,page_key
        ORDER BY CASE
          WHEN page_key='home' AND section_key='featured' THEN 0
          WHEN page_key='offers' AND section_key='memberships' THEN 0
          WHEN page_key='festival' AND section_key='festival' THEN 0
          WHEN page_key='yearly' AND section_key='yearly' THEN 0
          ELSE 1 END,
          datetime(updated_at) DESC,id DESC
      ) AS rn
      FROM page_placements WHERE visible=1
    ) WHERE rn>1
  )`).run().catch(()=>{});

  // Repair legacy duplicate product images and the old multiple-cover state.
  await env.DB.prepare("DELETE FROM product_images WHERE id NOT IN (SELECT MIN(id) FROM product_images GROUP BY product_id, object_key)").run().catch(() => {});
  await env.DB.prepare("DELETE FROM product_images WHERE id NOT IN (SELECT MIN(id) FROM product_images GROUP BY product_id, public_url)").run().catch(() => {});
  await env.DB.prepare("UPDATE product_images SET is_cover=0 WHERE is_cover=1 AND id NOT IN (SELECT MIN(id) FROM product_images WHERE is_cover=1 GROUP BY product_id)").run().catch(()=>{});
  await env.DB.prepare(`DELETE FROM product_images WHERE id IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER(PARTITION BY product_id ORDER BY sort_order,id) AS rn FROM product_images) WHERE rn>3)`).run().catch(()=>{});
  await applyDefaultPageUpgrades(env).catch(() => {});
  await ensureV128CheckoutColumns(env);
  await writeSchemaReadyMarker(env);
  schemaReadyInThisIsolate = true;
}
