import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const packageJson=JSON.parse(read('package.json'));
const packageLock=JSON.parse(read('package-lock.json'));
assert.equal(packageJson.version,'1.33.0');
assert.equal(packageLock.version,'1.33.0');
assert.equal(packageLock.packages[''].version,'1.33.0');
assert.match(read('DANCE-STUDIO-VERSION.txt'),/DANCE-STUDIO-V1.33/);

const badgeGuardSource=read('public/admin/final-v16-87-business-notifications-order-focus.js');
const navigationSource=read('public/admin/final-v16-53-navigation-brand-notifications.js');
const inboxSource=read('public/admin/final-v16-62-inbox-nav-automations.js');

// Every assignment observed through the hidden attribute must be idempotent.
assert.match(badgeGuardSource,/if\(node\.hidden\)node\.hidden=false/);
assert.match(badgeGuardSource,/if\(node\.textContent\)node\.textContent=''/);
assert.match(badgeGuardSource,/if\(!node\.hidden\)node\.hidden=true/);
assert.match(badgeGuardSource,/requestAnimationFrame\(\(\)=>\{/);
assert.match(badgeGuardSource,/observer\.disconnect\(\)/);
assert.match(badgeGuardSource,/if\(root\.isConnected\)observer\.observe\(root,options\)/);
assert.doesNotMatch(badgeGuardSource,/queueMicrotask\(\(\)=>\{queued=false/);
assert.match(navigationSource,/if\(b\.hidden\)b\.hidden=false/);
assert.match(navigationSource,/if\(!b\.hidden\)b\.hidden=true/);
assert.match(inboxSource,/if\(b\.textContent!==text\)b\.textContent=text/);
assert.match(inboxSource,/if\(!b\.hidden\)b\.hidden=true/);

const classList={add(){},remove(){},toggle(){return false;},contains(){return false;}};
const toggle={
  dataset:{},
  classList,
  querySelector(){return null;},
  querySelectorAll(){return[];},
  addEventListener(){},
  appendChild(){},
  insertBefore(){}
};
const group={
  dataset:{},
  classList,
  isConnected:true,
  querySelector(selector){return selector===':scope>.nav-group-toggle'?toggle:null;},
  querySelectorAll(){return[];}
};
let badgeText='';
let badgeHidden=true;
let textWrites=0;
let hiddenWrites=0;
const emptyTicketBadge={
  classList,
  get textContent(){return badgeText;},
  set textContent(value){textWrites++;badgeText=String(value);},
  get hidden(){return badgeHidden;},
  set hidden(value){hiddenWrites++;badgeHidden=Boolean(value);}
};
const document={
  readyState:'complete',
  querySelector(selector){
    if(selector==='.side .nav .nav-group[data-group-title="Business Ops"]')return group;
    if(selector==='.side .nav .nav-group[data-group-title="Business Ops"]>.nav-group-toggle')return toggle;
    return null;
  },
  querySelectorAll(selector){
    if(selector==='.side .nav .nav-badge')return[emptyTicketBadge];
    return[];
  },
  createElement(){throw new Error('The zero-count regression must not create a badge.');},
  addEventListener(){}
};
const observers=[];
class MutationObserver{
  constructor(callback){this.callback=callback;this.observeCalls=0;this.disconnectCalls=0;observers.push(this);}
  observe(){this.observeCalls++;}
  disconnect(){this.disconnectCalls++;}
}
const storage=new Map();
const sandbox={
  console,
  document,
  MutationObserver,
  localStorage:{
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value))
  },
  requestAnimationFrame:callback=>{callback();return 1;},
  setTimeout:(callback,delay=0)=>{if(Number(delay)<=1000)callback();return 1;},
  clearTimeout(){},
  A:{}
};
sandbox.window=sandbox;
vm.runInNewContext(badgeGuardSource,sandbox,{filename:'final-v16-87-business-notifications-order-focus.js'});
assert.equal(observers.length,1,'the Business Ops zero-badge guard must install once');
const observer=observers[0];
assert.equal(observer.observeCalls,1);
textWrites=0;
hiddenWrites=0;
observer.callback([{type:'attributes',attributeName:'hidden',target:emptyTicketBadge}]);
assert.equal(observer.disconnectCalls,1,'the observer must pause while normalizing its own DOM');
assert.equal(observer.observeCalls,2,'the observer must resume after normalization');
assert.equal(textWrites,0,'an already-empty badge must not be rewritten');
assert.equal(hiddenWrites,0,'an already-hidden badge must not be rewritten');
assert.equal(emptyTicketBadge.hidden,true);
assert.equal(emptyTicketBadge.textContent,'');

console.log('DropBeat V1.18 verified: the admin badge observer cannot retrigger itself, hidden badges are updated idempotently, and the admin event loop remains available for clicks.');
