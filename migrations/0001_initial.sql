-- Initial Cloudflare D1 schema retained for DropBeat Dance Studio compatibility.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  data_base64 TEXT NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'd1',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'subscription',
  short_description TEXT,
  description TEXT,
  regular_price_paise INTEGER NOT NULL DEFAULT 0,
  offer_price_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active',
  badge TEXT,
  features_json TEXT NOT NULL DEFAULT '[]',
  eligibility TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  billing_months INTEGER NOT NULL DEFAULT 1,
  horizon_years INTEGER NOT NULL DEFAULT 21,
  total_count INTEGER NOT NULL DEFAULT 252,
  regular_price_paise INTEGER NOT NULL DEFAULT 0,
  offer_price_paise INTEGER NOT NULL DEFAULT 0,
  setup_amount_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_plan_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS page_placements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  page_key TEXT NOT NULL,
  section_key TEXT NOT NULL DEFAULT 'featured',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, page_key, section_key),
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  desktop_image_url TEXT,
  mobile_image_url TEXT,
  object_key TEXT,
  link_type TEXT NOT NULL DEFAULT 'product',
  link_value TEXT,
  badge TEXT,
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  city TEXT,
  preferred_role TEXT,
  consent_whatsapp INTEGER NOT NULL DEFAULT 0,
  consent_email INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  amount_paise INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'new_checkout',
  payment_status TEXT NOT NULL DEFAULT 'awaiting_payment',
  gateway TEXT,
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_subscription_id TEXT,
  fallback_url TEXT,
  failure_reason TEXT,
  onboarding_status TEXT NOT NULL DEFAULT 'pending',
  group_access_status TEXT NOT NULL DEFAULT 'pending',
  internal_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  variant_id INTEGER,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_amount_paise INTEGER NOT NULL DEFAULT 0,
  billing_months INTEGER NOT NULL DEFAULT 1,
  horizon_years INTEGER NOT NULL DEFAULT 21,
  total_count INTEGER NOT NULL DEFAULT 252,
  setup_amount_paise INTEGER NOT NULL DEFAULT 0,
  gateway_subscription_id TEXT,
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT,
  gateway TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  body_html TEXT NOT NULL,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  email TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings(key, value) VALUES
('site_settings', json_object(
  'siteName','Urgent Casting',
  'tagline','Verified audition updates delivered on WhatsApp',
  'primaryColor','#8A0505',
  'accentColor','#FFD45A',
  'logoUrl','/assets/urgent-casting-logo.png',
  'faviconUrl','/assets/favicon.png',
  'whatsappNumber','9193919375',
  'footerText','Website designed by Instautomate',
  'googleAnalyticsMeasurementId','',
  'googleTagManagerId','',
  'metaPixelId','',
  'searchConsoleVerification','',
  'socials', json_array(
    json_object('key','instagram','label','Instagram','url','','enabled',0),
    json_object('key','facebook','label','Facebook','url','','enabled',0),
    json_object('key','threads','label','Threads','url','','enabled',0),
    json_object('key','youtube','label','YouTube','url','','enabled',0),
    json_object('key','telegram','label','Telegram','url','','enabled',0),
    json_object('key','snapchat','label','Snapchat','url','','enabled',0),
    json_object('key','x','label','X','url','','enabled',0),
    json_object('key','linkedin','label','LinkedIn','url','','enabled',0),
    json_object('key','whatsapp','label','WhatsApp','url','https://wa.me/9193919375','enabled',1)
  )
));

INSERT OR IGNORE INTO products(sku, name, slug, type, short_description, description, regular_price_paise, offer_price_paise, badge, features_json, eligibility, sort_order) VALUES
('UC-STARTER','Starter Access','starter-access','subscription','For freshers and beginners who want regular casting updates.','Open audition updates, fresher-friendly requirements and WhatsApp group access.',39900,19900,'Launch Offer',json_array('WhatsApp audition updates','Open casting calls','Beginner-friendly roles','Order tracking access'),'Freshers, beginners and junior artists',1),
('UC-ACTOR','Actor Access','actor-access','subscription','For regular actors looking for better filtered opportunities.','More filtered audition updates for supporting roles, ads, OTT and regional projects.',59900,34900,'Popular',json_array('Everything in Starter','Better filtered roles','Regional and OTT updates','Priority onboarding'),'Actors actively applying for auditions',2),
('UC-SPECIAL','Special Access','special-access','subscription','For experienced actors seeking character and semi-lead role updates.','Special access to selected opportunities suitable for stronger profiles and experienced performers.',79900,49900,'Special',json_array('Selected character roles','Higher-value opportunities','Profile-specific alerts','Upgrade available'),'Experienced actors with strong portfolio',3),
('UC-ELITE','Elite Circle','elite-circle','subscription','For experienced performers looking for private and closed-door updates.','Elite membership for internal casting updates, private audition requirements and higher-value roles where available.',119900,79900,'Elite',json_array('Closed-door updates','Premium casting alerts','Experienced actor focus','Top opportunity alerts'),'Experienced actors suitable for premium requirements',4);

INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)
SELECT id, sku || '-MONTHLY', 'Monthly', 1, 21, 252, regular_price_paise, offer_price_paise FROM products;

INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)
SELECT id, sku || '-QUARTERLY', '3 Months', 3, 21, 84, regular_price_paise * 3, offer_price_paise * 3 FROM products;

INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)
SELECT id, sku || '-HALFYEAR', '6 Months', 6, 21, 42, regular_price_paise * 6, offer_price_paise * 6 FROM products;


INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)
SELECT id, sku || '-NINEMONTH', '9 Months', 9, 21, 28, regular_price_paise * 9, offer_price_paise * 9 FROM products;

INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)
SELECT id, sku || '-YEARLY', 'Yearly', 12, 21, 21, regular_price_paise * 12, offer_price_paise * 12 FROM products;

INSERT OR IGNORE INTO product_variants(product_id, sku, name, billing_months, horizon_years, total_count, regular_price_paise, offer_price_paise)
SELECT id, sku || '-THREEYEAR', '3 Years', 36, 21, 7, regular_price_paise * 36, offer_price_paise * 36 FROM products;

INSERT OR IGNORE INTO page_placements(product_id, page_key, section_key, sort_order)
SELECT id, 'home', 'featured', sort_order FROM products;

INSERT OR IGNORE INTO page_placements(product_id, page_key, section_key, sort_order)
SELECT id, 'offers', 'memberships', sort_order FROM products;

INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)
SELECT id, 'seed/product-starter.svg', '/assets/product-starter.svg', 'Starter Access membership image', 1, 1 FROM products WHERE sku='UC-STARTER';
INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)
SELECT id, 'seed/product-actor.svg', '/assets/product-actor.svg', 'Actor Access membership image', 1, 1 FROM products WHERE sku='UC-ACTOR';
INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)
SELECT id, 'seed/product-special.svg', '/assets/product-special.svg', 'Special Access membership image', 1, 1 FROM products WHERE sku='UC-SPECIAL';
INSERT OR IGNORE INTO product_images(product_id, object_key, public_url, alt_text, sort_order, is_cover)
SELECT id, 'seed/product-elite.svg', '/assets/product-elite.svg', 'Elite Circle membership image', 1, 1 FROM products WHERE sku='UC-ELITE';

INSERT OR IGNORE INTO banners(title, subtitle, desktop_image_url, mobile_image_url, link_type, link_value, badge, visible, sort_order) VALUES
('Launch Offer: Starter Access at ₹199/month','Join verified audition updates on WhatsApp. Limited-time founding member price.','/assets/banner-1.svg','/assets/banner-1.svg','product','starter-access','Launch Offer',1,1),
('Elite Circle for Experienced Actors','Private and premium opportunity alerts for suitable profiles.','/assets/banner-2.svg','/assets/banner-2.svg','product','elite-circle','Elite',1,2),
('Special Access for Character Roles','For experienced actors looking for higher-value role updates.','/assets/banner-3.svg','/assets/banner-3.svg','product','special-access','Special',1,3);


-- Add-on admin/blog/success-story tables
CREATE TABLE IF NOT EXISTS blog_post_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, tag),
  FOREIGN KEY(post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS success_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'youtube',
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_email_change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  new_email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS visitor_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  source TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
