/* One registry shared by the browser and Pages Functions. Defaults retain native behavior. */
const front=(key,label,target,selector,description='')=>({key:'front.'+key,category:'front',label,target,selector,description});
const admin=(key,label,target,selector,description='')=>({key:'admin.'+key,category:'admin',label,target,selector,description});
export const BUTTON_DEFINITIONS=Object.freeze([
 front('header.checkout','Checkout','/checkout','.nav-actions .cart-pill','Cart count is retained.'),
 front('header.trial','Book a Trial','/submit-profile','.nav-actions .join-pill'),
 front('home.explore','Explore Dance Plans','action:hero-link','.hero-actions>a:first-child','Keeps each banner’s configured link.'),
 front('home.membership','My Membership','/student-dashboard','.hero-actions>a:nth-child(2)'),
 front('home.discover','Discover DropBeat','/about','.dropbeat-welcome a.btn'),
 front('home.book_class','Book the Class','/submit-profile','.dropbeat-strip-action'),
 front('plan.book','Book Now','action:book-plan','.product-actions button[data-add],#ucOfferBook','Keeps the selected plan, cart and availability checks.'),
 front('plan.details','Details','action:plan-details','.product-actions a[href*="offer-details"],.product-actions [data-offer-details]','Keeps the selected plan’s own details link.'),
 front('plan.all','See All Plans','/offers','#featuredProductsSection .section-head a,.section-head a[href="/offers"]'),
 front('plan.interest',"I'm Interested",'action:plan-interest','#ucOfferInterest'),
 front('plan.more','View More Plans','/offers','.uc-offer-book-card a[href="/offers"]'),
 front('auth.signup','Sign Up','/login?signup=student','a[data-sign-up],a[href="/login?signup=student"]'),
 front('auth.student_tab','Student Sign Up','action:student-tab','[data-auth-mode="student"]'),
 front('auth.coach_tab','Coach Sign Up','action:coach-tab','[data-auth-mode="coach"]'),
 front('auth.login','Login','action:login','#portalLoginForm button[type="submit"],[data-auth-mode="login"],.navlinks [data-uc-nav-key="login"],.navlinks a[href="/login"],.navlinks a[href="/login.html"]','Keeps the existing validated account login.'),
 front('auth.student_create','Create Student Account','action:student-create','#studentSignupForm>button[type="submit"]'),
 front('auth.coach_create','Create Coach Account','action:coach-create','#coachSignupForm>button[type="submit"]'),
 front('auth.google_login','Continue with Google','action:google-login','[data-google-login]'),
 front('auth.google_signup','Sign Up with Google','action:google-signup','[data-google-signup]'),
 front('auth.otp','Login with OTP','action:otp-login','[data-v122-otp-login]'),
 front('auth.forgot','Forgot Password?','action:forgot-password','[data-v122-forgot]'),
 front('misc.more','See more','action:expand','[data-db109-coach-more][aria-expanded="false"]'),
 front('misc.less','See less','action:collapse','[data-db109-coach-more][aria-expanded="true"]'),
 front('stories.all','View All Stories','/success-stories','a.btn[href="/success-stories"]'),
 front('trial.submit','Book My Free Trial','action:submit-trial','#profileForm button[type="submit"],#submitProfileForm button[type="submit"]'),
 front('contact.submit','Send Message','action:send-message','#contactForm button[type="submit"]'),
 front('request.submit','Submit Request','action:submit-request','#ucRequestSubmit'),
 front('not_found.home','Go to Home','/','main a.btn[href="/"]'),
 front('not_found.contact','Contact Us','/contact','main a.btn[href="/contact"]'),
 admin('subscription','Create Subscription','action:create-subscription','#dashboard [onclick="tab(\'customSubscription\')"]'),
 admin('plan','Add New Plan / Offer','action:new-plan','#products [onclick="newProduct()"]'),
 admin('sample','Download Sample CSV','/sample-plan-import.csv?build=dropbeat-1.40-20261014','#bulk a[download]'),
 admin('page','Create New Page','action:new-page','[data-create-page]')
].map(row=>Object.freeze(row)));
export const BUTTON_BY_KEY=new Map(BUTTON_DEFINITIONS.map(row=>[row.key,row]));
export const DEFAULT_BUTTON_REVISION='defaults-v156';
export function normalizeButtonLabel(value){
 const text=String(value??'').trim();if(!text||text.length>80||/[<>\u0000-\u001f\u007f]/.test(text))throw new Error('Enter a plain-text button label of 1–80 characters.');return text;
}
export function normalizeButtonTarget(value,definition){
 let target=String(value??'').trim();if(!target||target.length>2048||/[\\\u0000-\u0020\u007f]/.test(target))throw new Error('Enter a valid URL or the original action slug.');
 if(target.startsWith('action:')){if(target!==definition.target||!definition.target.startsWith('action:'))throw new Error('Use this button’s original action slug or a page URL.');return target;}
 if(target.startsWith('#'))return target;
 if(/^[a-z0-9][a-z0-9/_?&=.#%+-]*$/i.test(target))target='/'+target;
 if(target.startsWith('/')){if(target.startsWith('//')||/^\/(?:%2f|%5c)/i.test(target))throw new Error('Protocol-relative URLs are not supported.');const url=new URL(target,'https://dictionary.invalid');if(url.origin!=='https://dictionary.invalid'||url.pathname.startsWith('//')||/^\/(?:%2f|%5c)/i.test(url.pathname))throw new Error('Enter a local page path.');return url.pathname+url.search+url.hash;}
 let url;try{url=new URL(target);}catch{throw new Error('Use a /page path, https:// URL, or the original action slug.');}
 if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw new Error('External destinations must use HTTPS without embedded credentials.');return url.href;
}
export function dictionaryButtons(overrides={},category=''){
 return BUTTON_DEFINITIONS.filter(row=>!category||row.category===category).map(row=>{
  let value={};try{const saved=overrides[row.key];if(saved)value={label:normalizeButtonLabel(saved.label),target:normalizeButtonTarget(saved.target,row)};}catch{}
  return {...row,defaultLabel:row.label,defaultTarget:row.target,...value};
 });
}
