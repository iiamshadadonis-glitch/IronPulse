const clean=(v,n=20000)=>String(v??'').trim().slice(0,n);
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function gmailConnectionVerified(gmail={}){
  return !!(gmail.clientId&&gmail.clientSecret&&gmail.refreshToken&&gmail.connectedEmail&&gmail.connectionState==='connected'&&gmail.scopeStatus==='verified_send');
}

function bytesToBase64(bytes){
  let bin='',chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode(...bytes.subarray(i,Math.min(bytes.length,i+chunk)));
  return btoa(bin);
}
function bytesToBase64Url(bytes){return bytesToBase64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function utf8Base64Url(text){return bytesToBase64Url(new TextEncoder().encode(String(text||'')));}
function headerText(v){return String(v||'').replace(/[\r\n]+/g,' ').trim();}
function asciiSubject(v){return headerText(v).replace(/[–—]/g,'-').replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();}

export async function gmailAccessToken(gmail){
  if(!gmailConnectionVerified(gmail))throw new Error('Gmail connection is not verified. Reconnect Gmail, approve the Gmail send permission, and run Test Connection.');
  const body=new URLSearchParams({client_id:gmail.clientId,client_secret:gmail.clientSecret,refresh_token:gmail.refreshToken,grant_type:'refresh_token'});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.access_token)throw new Error(data.error_description||data.error||'Gmail access could not be refreshed. Reconnect Gmail in Settings -> Social Media.');
  return data.access_token;
}

function mimeMessage({fromName,fromEmail,to,bcc='',replyTo='',subject,html,text='',attachments=[]}){
  const mixed=`uc_mixed_${crypto.randomUUID().replace(/-/g,'')}`;
  const alt=`uc_alt_${crypto.randomUUID().replace(/-/g,'')}`;
  const lines=[
    `From: ${headerText(fromName||'IronPulse Gym')} <${headerText(fromEmail)}>`,
    `To: ${headerText(to)}`,
    ...(bcc&&EMAIL_RE.test(bcc)?[`Bcc: ${headerText(bcc)}`]:[]),
    ...(replyTo&&EMAIL_RE.test(replyTo)?[`Reply-To: ${headerText(replyTo)}`]:[]),
    `Subject: ${asciiSubject(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    `--${alt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    clean(text||'Please view this email in an HTML-capable email application.',50000),
    '',
    `--${alt}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    String(html||''),
    '',
    `--${alt}--`,
    ''
  ];
  for(const a of attachments||[]){
    const bytes=a?.bytes instanceof Uint8Array?a.bytes:new Uint8Array(a?.bytes||[]);
    if(!bytes.length)continue;
    const filename=headerText(a.filename||'document.pdf').replace(/["\\]/g,'-');
    lines.push(
      `--${mixed}`,
      `Content-Type: ${headerText(a.contentType||'application/octet-stream')}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      bytesToBase64(bytes),
      ''
    );
  }
  lines.push(`--${mixed}--`,'');
  return lines.join('\r\n');
}

export async function sendGmailMessage(gmail,{to,bcc='',replyTo='',subject,html,text='',attachments=[],fromName=''}){
  if(!gmail?.enabled&&!gmail?.otpEnabled)throw new Error('Gmail sending is disabled. Enable the required Gmail option in Settings -> Social Media.');
  if(gmail?.connectionState!=='connected'||gmail?.scopeStatus!=='verified_send')throw new Error('Gmail sending permission is not verified. Reconnect Gmail, approve the Gmail send permission, and run Test Connection.');
  const recipient=clean(to,240).toLowerCase();
  if(!EMAIL_RE.test(recipient))throw new Error('The recipient does not have a valid email address.');
  const fromEmail=clean(gmail.senderEmail||gmail.connectedEmail,240).toLowerCase();
  if(!EMAIL_RE.test(fromEmail))throw new Error('Connected Gmail address is unavailable. Reconnect Gmail in Settings -> Social Media.');
  const access=await gmailAccessToken(gmail);
  const mime=mimeMessage({fromName:fromName||gmail.senderName||'IronPulse Gym',fromEmail,to:recipient,bcc:clean(bcc,240).toLowerCase(),replyTo:clean(replyTo,240).toLowerCase(),subject,html,text,attachments});
  const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:`Bearer ${access}`,'content-type':'application/json'},body:JSON.stringify({raw:utf8Base64Url(mime)})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error?.message||'Gmail could not send the email.');
  return {ok:true,provider:'gmail',id:data.id||''};
}
