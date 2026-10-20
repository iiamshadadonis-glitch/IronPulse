import { json } from '../../../_lib/utils.js';
import { clearPortalCookie, revokePortalSession } from '../../../_lib/portal-auth.js';

export async function onRequestPost({request,env}){await revokePortalSession(request,env).catch(()=>{});return json({ok:true},200,{'set-cookie':clearPortalCookie()});}
