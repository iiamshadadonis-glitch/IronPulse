-- V16.88: indexes used by subscriber reconciliation and date-range analytics.
-- They reduce rows scanned; no existing records or business rules are changed.
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_subscription_status ON orders(gateway_subscription_id, payment_status, status, id DESC);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_paid_status ON payment_receipts(paid_at, status, order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_status ON refund_requests(created_at, status, order_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_source ON visitor_events(created_at, source);
CREATE INDEX IF NOT EXISTS idx_contact_leads_created_source ON contact_leads(created_at, source);
CREATE INDEX IF NOT EXISTS idx_receipts_ist_day_status ON payment_receipts(date(NULLIF(paid_at,''),'+330 minutes'), status);
CREATE INDEX IF NOT EXISTS idx_refunds_ist_day_status ON refund_requests(date(NULLIF(created_at,''),'+330 minutes'), status);
CREATE INDEX IF NOT EXISTS idx_visitors_ist_day_source ON visitor_events(date(NULLIF(created_at,''),'+330 minutes'), source);
CREATE INDEX IF NOT EXISTS idx_leads_ist_day_source ON contact_leads(date(NULLIF(created_at,''),'+330 minutes'), source);
PRAGMA optimize;
