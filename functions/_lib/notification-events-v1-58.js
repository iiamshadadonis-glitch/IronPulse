/* Additive bridges: notification failures never change business outcomes. */
import {enqueueNotification} from './notifications-v1-58.js';
export async function financialNotification(env,{event,orderId,eventKey,body=''}={}){
 const content=body||'Open your dashboard to review the latest payment or subscription update.';
 await enqueueNotification(env,{role:'admin',event,eventKey,body:content,url:'/admin/?app_tab=orders'});
 if(orderId){const order=await env.DB.prepare('SELECT customer_email FROM orders WHERE order_id=?').bind(orderId).first();if(order?.customer_email){const account=await env.DB.prepare("SELECT id FROM portal_accounts WHERE email=? COLLATE NOCASE AND role='student' AND status='active' LIMIT 1").bind(order.customer_email).first();if(account)await enqueueNotification(env,{role:'student',event,eventKey,ownerKey:'student:'+account.id,body:content,url:'/member-dashboard?view=memberships'});}}
}
export async function adminBusinessNotification(env,text,options={}){
 const type=String(options.eventType||'').toLowerCase(),raw=String(text||'');let event='';
 if(/cancel/.test(type)||/subscription (?:cancelled|canceled)|customer\.subscription\.deleted|subscription_schedule\.canceled/i.test(raw))event='subscription_cancelled';
 // Successful/failed payments use the receipt/recovery writers, including all gateways.
 if(!event)return;const orderId=/Order ID:\s*([^\s\n]+)/i.exec(raw)?.[1]||'';
 await financialNotification(env,{event,orderId,eventKey:options.eventKey||raw});
}
export async function portalEventNotification(env,accountId,{type,title,message,effectiveAt,sessionEventId}={}){
 const event=type==='ticket'?'ticket_reply':type;if(!['approval','account_status','class_change','session_started','studio_holiday','coach_leave','schedule_request','ticket_reply'].includes(event))return;
 const account=await env.DB.prepare('SELECT id,role FROM portal_accounts WHERE id=?').bind(accountId).first();if(!account)return;
 await enqueueNotification(env,{role:account.role,event,ownerKey:account.role+':'+account.id,title,body:message,eventKey:`portal:${account.id}:${type}:${sessionEventId||0}:${effectiveAt||''}:${title}:${message}`,effectiveAt,url:account.role==='coach'?'/coach-dashboard?view=notifications':'/member-dashboard?view=notifications'});
}
