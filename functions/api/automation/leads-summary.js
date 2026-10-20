import { json, requireAutomation } from '../../_lib/utils.js';
export async function onRequestGet({ request, env }) {
  try { await requireAutomation(request, env); } catch (e) { return json({ error: e.message }, 401); }
  const orders = await env.DB.prepare("SELECT status, payment_status, COUNT(*) count, COALESCE(SUM(amount_paise),0) amount_paise FROM orders WHERE created_at > datetime('now','-30 days') GROUP BY status,payment_status").all();
  const leads = await env.DB.prepare("SELECT status, COUNT(*) count FROM contact_leads WHERE created_at > datetime('now','-30 days') GROUP BY status").all();
  return json({ window: 'last_30_days', orders: orders.results || [], contact_leads: leads.results || [] });
}
