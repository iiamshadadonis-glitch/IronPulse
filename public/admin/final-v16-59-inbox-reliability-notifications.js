/* V16.59 — Social Inbox reliability, recognizable platform icons, emoji picker,
   attachment affordance, browser notifications and exact-conversation deep links.
   Additive only: V16.56 remains the Inbox rendering/sending source of truth. */
(()=>{
  'use strict';
  const $=(s,r=document)=>r?.querySelector?.(s)||null, $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const H=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apiJson=async(path,options={})=>{
    if(typeof window.api==='function')return window.api(path,options);
    const r=await fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`Request failed with HTTP ${r.status}.`);return d;
  };
  const platformLabel=k=>({facebook:'Facebook',instagram:'Instagram',whatsapp:'WhatsApp',x:'X / Twitter'}[k]||String(k||'Social'));
  const NOTIFY_KEY='uc_admin_notifications_enabled';
  const SEEN_KEY='uc_admin_dm_seen_v1659';
  const supportsNotifications=()=>('Notification'in window)&&('serviceWorker'in navigator)&&window.isSecureContext;
  const notificationsOn=()=>supportsNotifications()&&Notification.permission==='granted'&&localStorage.getItem(NOTIFY_KEY)==='1';
  const instagramSvg='<svg class="uc59-instagram-camera" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.4" cy="6.7" r="1.25" fill="currentColor"/></svg>';
  const paperclipSvg='<svg class="uc59-paperclip" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.4 12.9 14.9 6.4a3.4 3.4 0 0 1 4.8 4.8l-8.2 8.2a5 5 0 0 1-7.1-7.1l8-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const EMOJI={
    smileys:'😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 😏 😒 🙂‍↔️ 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 😶‍🌫️ 😐 😑 😬 🫨 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾'.split(' '),
    people:'👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 🫷 🫸 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦿 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 💋 🩸 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 👷 💂 🕵️ 👩‍⚕️ 👨‍⚕️ 👩‍🎓 👨‍🎓 👩‍🏫 👨‍🏫 👩‍⚖️ 👨‍⚖️ 👩‍🌾 👨‍🌾 👩‍🍳 👨‍🍳 👩‍🔧 👨‍🔧 👩‍🏭 👨‍🏭 👩‍💼 👨‍💼 👩‍🔬 👨‍🔬 👩‍💻 👨‍💻 👩‍🎤 👨‍🎤 👩‍🎨 👨‍🎨 👩‍✈️ 👨‍✈️ 👩‍🚀 👨‍🚀 👩‍🚒 👨‍🚒 🧕 👳 🤵 👰 🤰 🫃 🫄 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💪 🏋️ 🕴️ 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌'.split(' '),
    nature:'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🪲 🐞 🦗 🪳 🕷️ 🦂 🦟 🪰 🪱 🦠 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🪼 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🦭 🐊 🐅 🐆 🦓 🫏 🦍 🦧 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🫎 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🪽 🪶 🐓 🦃 🦤 🦚 🦜 🦢 🪿 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔 🐾 🐉 🐲 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🪺 🪹 🍄 🐚 🪸 🌾 💐 🌷 🪷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌚 🌕 🌙 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔥 🌪️ 🌈 ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 🫧 ☔ 🌊'.split(' '),
    food:'🍏 🍎 🍐 🍊 🍋 🍋‍🟩 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🫛 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫚 🫘 🥐 🥯 🍞 🥖 🫓 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫔 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 🫖 ☕ 🍵 🧃 🥤 🧋 🧉 🧊 🥢 🍽️ 🍴 🥄 🔪 🫙'.split(' '),
    activities:'⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 💪 🎨 💪 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩 🪩'.split(' '),
    travel:'🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🏍️ 🛵 🦽 🦼 🛺 🚲 🛴 🛹 🚏 🛣️ 🛤️ 🛢️ ⛽ 🛞 🚨 🚥 🚦 🛑 🚧 ⚓ 🛟 ⛵ 🛶 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️ 🎠 🛝 🎡 🎢 💈 🎪 🚂 🚆 🚇 🚊 🚉 🚞 🚝 🚄 🚅 🚈'.split(' '),
    objects:'⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ ⛓️‍💥 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🪥 🪒 🧴 🧷 🧹 🧽 🪣 🧼 🫧 🪥 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🪆 🖼️ 🪞 🪟 🛋️ 🪑 🚪 🛏️ 🧸 🪴 🧯 🛍️ 📦 📫 📬 📭 📮 📜 📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ 📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓'.split(' '),
    symbols:'❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧️ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ⏏️ ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🔀 🔁 🔂 🔄 🔃 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ ◼️ ◻️ ◾ ◽ ▪️ ▫️ 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲'.split(' '),
    flags:'🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇮🇳 🇺🇸 🇬🇧 🇦🇺 🇨🇦 🇦🇪 🇸🇦 🇶🇦 🇸🇬 🇲🇾 🇯🇵 🇰🇷 🇨🇳 🇭🇰 🇹🇼 🇹🇭 🇮🇩 🇵🇭 🇻🇳 🇳🇵 🇱🇰 🇧🇩 🇵🇰 🇦🇫 🇮🇷 🇮🇶 🇮🇱 🇯🇴 🇰🇼 🇴🇲 🇧🇭 🇹🇷 🇪🇬 🇿🇦 🇳🇬 🇰🇪 🇬🇭 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇳🇱 🇧🇪 🇨🇭 🇦🇹 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇮🇪 🇵🇱 🇬🇷 🇷🇺 🇺🇦 🇧🇷 🇦🇷 🇲🇽 🇨🇱 🇨🇴 🇵🇪 🇳🇿'.split(' ')
  };
  const CATEGORY_LABELS={smileys:'😀',people:'👋',nature:'🐾',food:'🍕',activities:'⚽',travel:'✈️',objects:'💡',symbols:'❤️',flags:'🏳️'};
  let emojiCategory='smileys';

  function renderEmojiGrid(row){
    const grid=$('.uc59-emoji-grid',row);if(!grid)return;
    grid.innerHTML=(EMOJI[emojiCategory]||EMOJI.smileys).map(e=>`<button type="button" class="uc59-emoji-choice" data-emoji="${H(e)}" aria-label="${H(e)}">${H(e)}</button>`).join('');
    $$('.uc59-emoji-category',row).forEach(b=>b.classList.toggle('active',b.dataset.category===emojiCategory));
  }
  function enhanceEmojiPicker(){
    const row=$('#uc56EmojiRow');if(!row||row.dataset.uc59Enhanced==='1')return;
    row.dataset.uc59Enhanced='1';row.classList.add('uc59-emoji-picker');
    row.innerHTML=`<div class="uc59-emoji-categories">${Object.keys(EMOJI).map(k=>`<button type="button" class="uc59-emoji-category ${k===emojiCategory?'active':''}" data-category="${H(k)}" title="${H(k[0].toUpperCase()+k.slice(1))}">${CATEGORY_LABELS[k]}</button>`).join('')}</div><div class="uc59-emoji-grid" role="listbox" aria-label="Emoji picker"></div>`;
    row.addEventListener('click',e=>{
      const cat=e.target.closest('.uc59-emoji-category');if(cat){emojiCategory=cat.dataset.category||'smileys';renderEmojiGrid(row);return;}
      const choice=e.target.closest('.uc59-emoji-choice');if(choice)window.ucV1656Emoji?.(choice.dataset.emoji||choice.textContent||'');
    });
    renderEmojiGrid(row);
  }
  function enhanceComposer(){
    enhanceEmojiPicker();
    const attach=$('#socialDMs button[title="Attach image"]');if(attach&&attach.dataset.uc59Enhanced!=='1'){attach.dataset.uc59Enhanced='1';attach.classList.add('uc59-attach-button');attach.innerHTML=paperclipSvg;attach.title='Attach image';attach.setAttribute('aria-label','Attach image');}
    const emoji=$('#socialDMs button[title="Emoji"]');if(emoji&&emoji.dataset.uc59Enhanced!=='1'){emoji.dataset.uc59Enhanced='1';emoji.innerHTML='😀';emoji.setAttribute('aria-label','Choose emoji');emoji.title='Choose emoji';}
  }
  function enhancePlatformIcons(){
    $$('#socialDMs .uc57-tab-icon.instagram,#socialDMs .uc57-platform-dot.instagram').forEach(el=>{if(el.dataset.uc59Icon==='1')return;el.dataset.uc59Icon='1';el.innerHTML=instagramSvg;el.setAttribute('aria-label','Instagram');});
    $$('#socialDMs .uc57-tab-icon.facebook,#socialDMs .uc57-platform-dot.facebook').forEach(el=>{if(el.dataset.uc59Icon==='1')return;el.dataset.uc59Icon='1';el.textContent='f';el.setAttribute('aria-label','Facebook');});
  }
  function enhanceInboxUi(){enhanceComposer();enhancePlatformIcons();ensureNotificationControl();}

  window.ucV1656ToggleEmoji=()=>{enhanceEmojiPicker();const e=$('#uc56EmojiRow');if(e){e.hidden=!e.hidden;if(!e.hidden)e.querySelector('.uc59-emoji-choice')?.focus({preventScroll:true});}};
  window.ucV1656Emoji=x=>{const t=$('#uc56DmText');if(!t)return;const emoji=String(x||''),start=Number.isFinite(t.selectionStart)?t.selectionStart:t.value.length,end=Number.isFinite(t.selectionEnd)?t.selectionEnd:start;t.value=t.value.slice(0,start)+emoji+t.value.slice(end);const pos=start+emoji.length;t.focus();try{t.setSelectionRange(pos,pos);}catch{}};
  document.addEventListener('pointerdown',e=>{const picker=$('#uc56EmojiRow');if(!picker||picker.hidden)return;if(e.target.closest('#uc56EmojiRow')||e.target.closest('#socialDMs button[title="Choose emoji"]'))return;picker.hidden=true;});

  function notificationState(){
    if(!supportsNotifications())return 'Not supported in this browser';
    if(Notification.permission==='denied')return 'Blocked in browser';
    return notificationsOn()?'Notifications On':'Notifications Off';
  }
  async function serviceWorker(){if(!supportsNotifications())return null;try{await navigator.serviceWorker.register('/uc-notifications-sw.js?v=16.59',{scope:'/'});return navigator.serviceWorker.ready;}catch{return null;}}
  async function setNotifications(enable){
    if(!supportsNotifications()){window.ucAdminToast?.('Secure browser notifications are not supported here.','error');return;}
    if(enable){let permission=Notification.permission;if(permission!=='granted')permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem(NOTIFY_KEY,'1');await serviceWorker();window.ucAdminToast?.('Admin notifications are enabled. New supported Inbox messages and comments can alert this browser.','success');}else{localStorage.setItem(NOTIFY_KEY,'0');window.ucAdminToast?.('Notifications are blocked. Allow Notifications for this IronPulse Gym website in browser site settings, then enable them again.','error');}}
    else{localStorage.setItem(NOTIFY_KEY,'0');window.ucAdminToast?.('Admin notifications are disabled for this browser.','success');}
    syncNotificationControls();
  }
  function ensureNotificationControl(){
    const panel=$('#socialDMs'),top=panel?.querySelector(':scope>.top');if(!top)return;
    let b=$('#uc59InboxNotifications',top);if(!b){b=document.createElement('button');b.id='uc59InboxNotifications';b.type='button';b.className='btn secondary compact uc59-notification-button';b.addEventListener('click',()=>setNotifications(!notificationsOn()));const refresh=Array.from(top.children).find(x=>x.tagName==='BUTTON'&&/refresh/i.test(x.textContent||''));if(refresh)top.insertBefore(b,refresh);else top.appendChild(b);}
    const text=notificationState();if(b.textContent!==text)b.textContent=text;b.setAttribute('aria-pressed',notificationsOn()?'true':'false');b.title=notificationsOn()?'Admin browser notifications are enabled':'Enable browser notifications for new Inbox messages and comments';
  }
  function syncNotificationControls(){ensureNotificationControl();const old=$('#ucV1612EnableNotify');if(old)old.checked=notificationsOn();}

  function friendlyStatus(){
    const box=$('#uc56DmMsg');if(!box)return;const text=(box.textContent||'').trim();
    if(/^Synchronizing supported social inboxes/i.test(text)||/^Loading Inbox/i.test(text)){
      box.innerHTML='<div class="notice">Inbox is up to date. New supported messages will continue to synchronize automatically.</div>';
      setTimeout(()=>{if((box.textContent||'').includes('Inbox is up to date'))box.innerHTML='';},3200);
    }else if(/UNIQUE constraint failed:\s*social_dm_messages|SQLITE_CONSTRAINT_UNIQUE/i.test(text)){
      box.innerHTML='<div class="notice">Inbox refreshed. A duplicate copy of an already saved message was ignored safely.</div>';
    }else if(/reduce the amount of data/i.test(text)){
      box.innerHTML='<div class="notice">Instagram returned too much history in one response. Inbox switched to lightweight recent-message synchronization; click Refresh once more if the newest message has not appeared yet.</div>';
    }else if(/D1_ERROR|SQLITE_|constraint failed|database is locked/i.test(text)){
      box.innerHTML='<div class="error">Inbox storage could not finish this refresh. No existing messages were removed. Click Refresh to try again; if it repeats, check the D1 database binding in Cloudflare.</div>';
    }
  }
  function wrapInboxLoader(){
    const old=window.load_socialDMs;if(typeof old!=='function'||old.__uc59||old.__uc60||old.__uc61)return;
    const fn=async function(){const r=await old.apply(this,arguments);setTimeout(()=>{friendlyStatus();enhanceInboxUi();},0);return r;};fn.__uc59=true;fn.__uc59Old=old;window.load_socialDMs=fn;
  }

  function seenMap(){try{const v=JSON.parse(localStorage.getItem(SEEN_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
  function saveSeen(v){try{localStorage.setItem(SEEN_KEY,JSON.stringify(v));}catch{}}
  async function showDmNotification(c){
    if(window.DropBeatNotificationRules&&!await window.DropBeatNotificationRules.foregroundAllowedFresh('new_message'))return;if(!notificationsOn())return;const reg=await serviceWorker();if(!reg)return;
    const platform=String(c.platform||''),conversation=String(c.id||''),mid=String(c.last_message_id||Date.now()),who=c.participant_name||c.participant_username||'Someone',preview=String(c.last_message_text||'New message').slice(0,140),url=`/admin/?open=inbox&platform=${encodeURIComponent(platform)}&conversation=${encodeURIComponent(conversation)}`;
    await reg.showNotification(`New ${platformLabel(platform)} message`,{body:`${who}: ${preview}`,icon:'/assets/icon-192.png',badge:'/assets/icon-192.png',tag:`uc-admin-dm:${platform}:${mid}`,renotify:true,data:{url,route:'inbox',platform,conversation,message:mid}});
  }
  function updateInboxBadge(rows){const b=$('[data-tab="socialDMs"] .nav-badge'),n=(rows||[]).reduce((s,c)=>s+Number(c.unread_count||0),0);if(!b)return;b.textContent=n>99?'99+':String(n||'');b.hidden=!n;}

  let dmPollTimer=0,lastRemoteSync=0,pollBusy=false,seenInitialized=false;
  async function pollDms({forceRemote=false}={}){
    // V16.60+ owns the fast Inbox watcher. Keep this legacy timer dormant once the newer wrapper is installed.
    if(window.load_socialDMs?.__uc60||window.load_socialDMs?.__uc61)return;
    if(pollBusy||!navigator.onLine)return;pollBusy=true;
    try{
      const due=forceRemote||Date.now()-lastRemoteSync>120000;
      if(due){try{await apiJson('/api/admin/social-dms',{method:'POST',body:JSON.stringify({action:'refresh'})});lastRemoteSync=Date.now();}catch{/* lightweight fallback must never block local/webhook Inbox reads */}}
      const data=await apiJson('/api/admin/social-dms'),rows=data.conversations||[],seen=seenMap(),hadStored=Object.keys(seen).length>0;
      const fresh=[];
      for(const c of rows){const id=String(c.id||''),mid=String(c.last_message_id||'');if(!id||!mid)continue;const prior=seen[id]||'';if((seenInitialized||hadStored)&&prior&&prior!==mid&&String(c.last_direction||'')==='inbound')fresh.push(c);else if((seenInitialized||hadStored)&&!prior&&String(c.last_direction||'')==='inbound')fresh.push(c);seen[id]=mid;}
      saveSeen(seen);seenInitialized=true;updateInboxBadge(rows);
      for(const c of fresh)await showDmNotification(c);
      if($('#socialDMs')?.classList.contains('active'))await window.load_socialDMs?.(false);
    }catch{/* keep polling; visible Inbox shows its own actionable errors */}
    finally{pollBusy=false;}
  }

  async function openInboxRoute(force=false){
    const q=new URLSearchParams(location.search);if(q.get('open')!=='inbox')return false;
    const conversation=Number(q.get('conversation')||0),platform=q.get('platform')||'all';
    window.tab?.('socialDMs');
    await window.load_socialDMs?.(false);
    if(platform&&['facebook','instagram','whatsapp','x'].includes(platform))window.ucV1657InboxFilter?.(platform);
    if(conversation){let exists=(window.UCV1656?.dms?.conversations||[]).some(x=>Number(x.id)===conversation);if(!exists&&force){await pollDms({forceRemote:true});await window.load_socialDMs?.(false);exists=(window.UCV1656?.dms?.conversations||[]).some(x=>Number(x.id)===conversation);}if(exists)await window.ucV1656OpenDm?.(conversation);}
    return true;
  }

  function install(){
    wrapInboxLoader();enhanceInboxUi();serviceWorker();
    const panel=$('#socialDMs');if(panel&&!panel.__uc59Observer){const obs=new MutationObserver(()=>enhanceInboxUi());obs.observe(panel,{childList:true,subtree:true});panel.__uc59Observer=obs;}
    clearInterval(dmPollTimer);dmPollTimer=setInterval(()=>{if(document.visibilityState==='visible')pollDms();},300000);setTimeout(()=>pollDms({forceRemote:true}),7000);setTimeout(()=>openInboxRoute(true),900);
  }
  if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',e=>{const d=e.data||{};if(d.type==='uc-admin-route'&&d.route==='inbox'&&d.url){try{const u=new URL(d.url,location.origin);history.replaceState({},'',u.pathname+u.search);openInboxRoute(true);}catch{}}});
  document.addEventListener('change',e=>{if(e.target?.id==='ucV1612EnableNotify')setTimeout(syncNotificationControls,80);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){syncNotificationControls();pollDms();}});
  window.addEventListener('storage',e=>{if(e.key===NOTIFY_KEY)syncNotificationControls();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,850),{once:true});else setTimeout(install,850);
  setTimeout(()=>{wrapInboxLoader();enhanceInboxUi();},2400);
})();
