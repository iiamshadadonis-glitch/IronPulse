import { json, requireAutomation } from '../../_lib/utils.js';
import { processDuePaymentRecoveryEmails } from '../../_lib/payment-recovery.js';
export async function onRequestGet({request,env}){try{await requireAutomation(request,env);}catch(e){return json({error:e.message},401);}try{return json(await processDuePaymentRecoveryEmails(env,{limit:100}));}catch(e){return json({error:e.message||'Payment reminders could not be processed.'},500);}}
export const onRequestPost=onRequestGet;
