import {json} from '../../../_lib/utils.js';
import {appSession,SESSION_HEADERS} from '../../../_lib/app-session-v1-58.js';
import {notificationRules,pushKeys} from '../../../_lib/notifications-v1-58.js';
export async function onRequestGet({request,env}){try{const actor=await appSession(request,env,{preferredRole:new URL(request.url).searchParams.get('role')||''});if(!actor)return json({error:'Login required.'},401,SESSION_HEADERS);const rules=await notificationRules(env),keys=await pushKeys(env);return json({ok:true,role:actor.role,key:actor.key,revision:rules.revision,rules:rules.roles[actor.role],publicKey:keys?.publicKey||''},200,SESSION_HEADERS);}catch{return json({error:'Notification preferences could not be checked.'},503,SESSION_HEADERS);}}
