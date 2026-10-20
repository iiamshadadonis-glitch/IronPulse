import { json, requireAdmin } from '../../_lib/utils.js';
import { getGatewayAvailability, gatewayLabel } from '../../_lib/payment-gateways.js';

export async function onRequestPost({ request, env }) {
  try { await requireAdmin(request, env); } catch(e) { return json({ error:e.message }, 401); }
  try {
    const a = await getGatewayAvailability(env);
    const active = (a.participating || []).map(gatewayLabel);
    return json({
      ok: true,
      primary_gateway: a.primary || '',
      enabled_gateways: a.participating || [],
      message: active.length
        ? `Checked ${active.join(' + ')} configuration. Webhook-updated payments are refreshed from the database.`
        : 'No Payment Gateway is enabled yet. Enable a gateway in Settings → Payments first.'
    });
  } catch (e) {
    return json({ error: e.message || 'Payment Gateway configuration could not be refreshed.' }, 400);
  }
}
