import { json, readJson } from '../../../_lib/utils.js';
import { onRequestPost as adminLogin } from '../../admin/auth/login.js';
import { createPortalSession, ensurePortalSchema, portalEmail, portalRouteFor, publicPortalAccount, verifyPortalPassword } from '../../../_lib/portal-auth.js';

export async function onRequestPost({request,env}){
  try{
    const body=await readJson(request.clone()),email=portalEmail(body.email),password=String(body.password||'');
    if(!email||!password)return json({error:'Email and password are required.'},400);
    // Existing admin authentication remains authoritative. It is tried first so
    // the same public Login screen can route an administrator without changing
    // the proven admin-session implementation. V1.28 deliberately performs this
    // check before portal schema preparation, keeping Admin access independent
    // from optional Student/Coach table maintenance.
    const adminResponse=await adminLogin({request:request.clone(),env});
    if(adminResponse.ok){
      const data=await adminResponse.clone().json();return json({ok:true,role:'admin',status:'active',route:'/admin/',email:data.email},200,{'set-cookie':adminResponse.headers.get('set-cookie')||''});
    }
    await ensurePortalSchema(env);
    const account=await env.DB.prepare('SELECT * FROM portal_accounts WHERE lower(email)=? LIMIT 1').bind(email).first();
    if(!account||!await verifyPortalPassword(password,account))return json({error:'The email or password is incorrect.'},401);
    if(account.status==='rejected')return json({error:'This account application was not approved. Contact the studio if you believe this is a mistake.'},403);
    const session=await createPortalSession(env,account.id,{maxAge:body.remember===false?7*24*60*60:undefined});
    return json({ok:true,role:account.role,status:account.status,route:portalRouteFor(account.role,account.status),account:publicPortalAccount(account)},200,{'set-cookie':session.header});
  }catch(error){return json({error:error.message||'Login could not be completed.'},400);}
}
