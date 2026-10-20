import {json} from '../../../_lib/utils.js';
import {appSession,publicAppSession,SESSION_HEADERS} from '../../../_lib/app-session-v1-58.js';
export async function onRequestGet({request,env}){try{const role=new URL(request.url).searchParams.get('role')||'',session=await appSession(request,env,{preferredRole:role,renew:true});return json(publicAppSession(session),200,{...SESSION_HEADERS,...(session?.cookie?{'set-cookie':session.cookie}:{})});}catch{return json({ok:false,error:'Your session could not be checked. Please retry.'},503,SESSION_HEADERS);}}
