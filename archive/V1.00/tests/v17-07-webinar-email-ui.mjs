import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emailAutomationTemplates } from '../functions/_lib/email-automations.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const engine=read('functions/_lib/email-automations.js');
const webinar=read('functions/_lib/marketing-suite.js');
const studio=read('public/admin/final-v17-05-email-automations.js');
const studioCss=read('public/admin/final-v17-05-email-automations.css');
const providers=read('public/admin/final-v17-06-email-providers.js');
const providerCss=read('public/admin/final-v17-06-email-providers.css');
const grid=read('public/admin/final-v16-49-integrations-marquee.js');
const outbound=read('functions/_lib/outbound-email.js');
const requestOtp=read('functions/api/auth/request-otp.js');
const publicOtp=read('functions/api/public/order-otp-settings.js');
const index=read('public/admin/index.html');

assert.match(engine,/webinar_attended/,'Webinar attendance must be a first-class automation condition.');
assert.match(engine,/contact_form_submitted_after_previous_email/,'Missed attendees must be checked for a later contact-form response.');
assert.match(engine,/We missed you at the webinar/,'Missed attendees need a dedicated nurturing email.');
assert.match(engine,/Final webinar re-registration reminder/,'Unengaged missed attendees need a final reminder.');
assert.match(engine,/source_event_id=\?/,'Attendance must be matched to the exact saved webinar event.');
assert.match(engine,/last_attendance_at/,'Attendance must use the recorded attendance field.');
assert.match(engine,/trueNextStepId/,'Conditions must support explicit matching branches.');
assert.match(engine,/falseNextStepId/,'Conditions must support explicit non-matching branches.');
assert.match(engine,/event_time/,'Webinar waits must support scheduled event time.');
assert.match(webinar,/webinarEventId/,'Enrollment context must preserve the webinar database id.');
assert.match(webinar,/eventEndsAt/,'Enrollment context must preserve the calculated webinar end time.');

assert.match(studio,/Webinar attendance/,'The condition editor must name the webinar attendance field.');
assert.match(studio,/Contact form submitted after previous email/,'The condition editor must explain the response condition.');
assert.match(studio,/When rules match/,'The editor must expose the yes branch.');
assert.match(studio,/When rules do not match/,'The editor must expose the no branch.');
assert.doesNotMatch(studio,/<details><summary class="btn secondary compact">Actions/,'The editor Actions control must not use the conflicting native disclosure arrow.');
assert.match(studio,/data-uc1707-menu-button/,'Editor action menus must use the single controlled popover.');
assert.match(studioCss,/\.uc1705-block-actions\{display:flex!important/,'Block move, duplicate and remove controls must remain visible.');

assert.doesNotMatch(providers,/Additional Email & OTP Integrations/,'A duplicate provider grid must not be rendered.');
assert.doesNotMatch(providers,/Primary sender/,'The unwanted primary sender toolbar must be removed.');
assert.doesNotMatch(providers,/uc1706-chevron/,'Provider summaries must not add a second arrow.');
assert.match(providers,/data-provider-back/,'Every provider must include a flip-style help view.');
assert.match(providers,/docs\.aws\.amazon\.com/,'AWS help must use official documentation links.');
assert.match(providers,/mailchimp\.com\/developer\/transactional/,'Mailchimp help must use official documentation links.');
assert.match(providers,/developers\.mailersend\.com/,'MailerSend help must use official documentation links.');
assert.match(providerCss,/\.uc1706-provider>summary::marker\{content:""\}/,'Provider cards must suppress the browser marker and rely on the themed arrow.');
assert.match(grid,/EMAIL_PROVIDER_ORDER/,'New providers must be included in Connected Email & OTP.');
assert.match(grid,/UCEmailProviderSettings/,'The existing grid must read provider connection state.');

assert.match(outbound,/gmailReady&&gmailAllowed/,'Connected enabled Gmail must remain first choice.');
assert.match(outbound,/settings\.primaryProvider/,'A configured fallback provider must remain available when Gmail is disabled.');
assert.match(requestOtp,/fallbackKeys\.some/,'OTP requests must recognize an enabled non-Gmail OTP provider.');
assert.match(publicOtp,/fallbackProvider/,'Public OTP availability must include an enabled non-Gmail provider.');
assert.match(index,/final-v17-05-email-automations\.js\?v=17\.08/,'Automation cache bust must be updated.');
assert.match(index,/final-v17-06-email-providers\.js\?v=17\.08/,'Provider cache bust must be updated.');

const webinarTemplate=emailAutomationTemplates().find(x=>x.id==='webinar');
assert.ok(webinarTemplate,'Webinar template must exist.');
const steps=webinarTemplate.steps;
const attendanceIndex=steps.findIndex(x=>x.config?.rules?.some(r=>r.field==='webinar_attended'));
const responseIndex=steps.findIndex(x=>x.config?.rules?.some(r=>r.field==='contact_form_submitted_after_previous_email'));
assert.ok(attendanceIndex>0&&responseIndex>attendanceIndex,'Attendance must be checked before missed-attendee response.');
const attendance=steps[attendanceIndex],missedIndex=steps.findIndex(x=>x.id===attendance.config.falseNextStepId);
assert.equal(attendance.config.trueAction,'continue','Attendees must continue to feedback.');
assert.equal(attendance.config.falseAction,'jump','Missed attendees must branch away from feedback.');
assert.match(steps[attendanceIndex+1].name,/feedback/i,'The attendee branch must send feedback next.');
assert.match(steps[missedIndex].name,/missed/i,'The missed branch must send the missed-webinar message.');
const response=steps[responseIndex],completeIndex=steps.findIndex(x=>x.id===response.config.trueNextStepId);
assert.equal(response.config.trueAction,'jump','A recorded contact response must end follow-up without another email.');
assert.equal(steps[completeIndex].type,'exit','The response branch must complete the workflow.');
assert.match(steps[responseIndex+1].name,/final/i,'No response must continue to the final invitation.');
assert.ok(steps.some(x=>x.type==='delay'&&x.config.unit==='event_time'&&x.config.eventDirection==='before_start'),'Webinar reminder must be scheduled before event start.');
assert.ok(steps.some(x=>x.type==='delay'&&x.config.unit==='event_time'&&x.config.eventDirection==='after_end'),'Attendance evaluation must wait until after event end.');

console.log('V17.07 webinar branching, editor controls and Email & OTP integration checks passed.');
