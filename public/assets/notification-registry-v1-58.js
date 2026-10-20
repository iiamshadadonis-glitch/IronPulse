/* Shared routing contract. Labels are presentation; event IDs remain stable. */
export const NOTIFICATION_ROLES=['admin','student','coach'];
const group=(id,label,events)=>({id,label,events:events.map(([id,label])=>({id,label}))});
export const NOTIFICATION_CATEGORIES={
 admin:[group('finance','Financial Notifications',[['payment_success','Successful Payment / Subscription'],['payment_failed','Failed Payment'],['subscription_cancelled','Canceled Subscription'],['refund_processed','Refund Update']]),group('social','Social Media',[['new_comment','New Comment'],['new_message','New Inbox Message']]),group('support','Support Tickets',[['ticket_created','New Support Ticket']])],
 student:[group('finance','Financial Notifications',[['payment_success','Successful Payment / Subscription'],['payment_failed','Failed Payment'],['subscription_cancelled','Canceled Subscription'],['refund_processed','Refund Update']]),group('classes','Classes & Schedule',[['class_change','Class / Coach Change'],['session_started','Session Ready'],['studio_holiday','Studio Holidays']]),group('account','Account & Support',[['approval','Account Approval'],['account_status','Account Status'],['ticket_reply','Ticket Reply']])],
 coach:[group('classes','Classes & Schedule',[['class_change','Class / Coach Change'],['session_started','Session Ready'],['coach_leave','Leave Updates'],['schedule_request','Schedule Request Updates'],['studio_holiday','Studio Holidays']]),group('account','Account & Support',[['approval','Account Approval'],['account_status','Account Status'],['ticket_reply','Ticket Reply']])]
};
export const eventsFor=role=>(NOTIFICATION_CATEGORIES[role]||[]).flatMap(c=>c.events);
export const defaults=()=>Object.fromEntries(NOTIFICATION_ROLES.map(role=>[role,Object.fromEntries(eventsFor(role).map(e=>[e.id,true]))]));
export function normalizeNotificationRules(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid notification rules.');const out=defaults();
 for(const[role,events]of Object.entries(input)){if(!NOTIFICATION_ROLES.includes(role)||!events||typeof events!=='object'||Array.isArray(events))throw Error('Invalid notification role.');for(const[id,enabled]of Object.entries(events)){if(!eventsFor(role).some(e=>e.id===id)||typeof enabled!=='boolean')throw Error('Invalid notification event or toggle.');out[role][id]=enabled;}}
 return out;
}
export function eventLabel(role,id){return eventsFor(role).find(e=>e.id===id)?.label||id;}
export const roleHome=role=>role==='admin'?'/admin/':role==='coach'?'/coach-dashboard':'/student-dashboard';
