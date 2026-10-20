import { json, requireAutomation } from '../../_lib/utils.js';
import { processLeadNurture } from '../../_lib/lead-nurturing.js';
import { processEmailAutomations, enrollScheduledEmailAutomations } from '../../_lib/email-automations.js';
export async function onRequestGet({request,env}){try{await requireAutomation(request,env);}catch(e){return json({error:e.message},401);}try{const calendar=await enrollScheduledEmailAutomations(env);const [leadNurturing,emailFollowUp]=await Promise.all([processLeadNurture(env,{limit:60,enroll:true}),processEmailAutomations(env,{limit:60})]);return json({ok:true,leadNurturing,emailFollowUp,calendar,processed:Number(leadNurturing?.processed||0)+Number(emailFollowUp?.processed||0)});}catch(e){return json({error:e.message||'Lead nurturing could not be processed.'},500);}}
export const onRequestPost=onRequestGet;
