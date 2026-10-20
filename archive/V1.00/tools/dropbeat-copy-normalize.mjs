import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = [
  'public/assets/final-v15-1-audition-blog.js',
  'public/assets/final-v15-3-audition-blog.js',
  'public/assets/final-v15-4-seo-comments-blog.js'
];

const replacements = new Map([
  ['Audition Update', 'Dance Tip'],
  ['Audition Updates', 'Dance Tips'],
  ['Audition update', 'Dance tip'],
  ['Audition updates', 'Dance tips'],
  ['audition updates', 'dance tips'],
  ['audition update', 'dance tip'],
  ['Latest Auditions & Casting Updates', 'Latest Dance Tips'],
  ['Daily Audition Updates', 'Dance Tips & Studio Updates'],
  ['Fresh casting calls, role requirements and audition opportunities in one clean place. Open any update to read the complete details.', 'Technique guidance, class preparation and studio news in one clean place. Open any dance tip to read the complete details.'],
  ['Read the latest casting and dance tip from DropBeat Dance Studio.', 'Read the latest dance tip and studio update from DropBeat Dance Studio.'],
  ['casting call', 'dance tip'],
  ['Casting Call', 'Dance Tip'],
  ['casting picks', 'dance tips'],
  ['audition library', 'dance-tip library'],
  ['audition opportunities', 'dance learning opportunities']
]);

for (const relative of files) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) source = source.split(from).join(to);
  fs.writeFileSync(file, source);
}

const exact = {
  'public/assets/app.js': [
    ['🎬 ${escapeHtml(b.badge', '♫ ${escapeHtml(b.badge']
  ],
  'public/assets/app-extra.js': [
    ['Audition update not found', 'Dance tip not found']
  ],
  'public/assets/final-v16-25-offer-details.js': [
    ['Membership provides access to casting updates where available. It does not guarantee auditions, callbacks, selection, employment, shoots or income.', 'Membership provides access to the class schedule and services shown in this plan. Session changes and cancellations follow the studio policies.']
  ],
  'public/assets/final-v16-30-offer-details.js': [
    ['Membership provides access to casting updates across India.', 'Membership provides access to the class schedule and services shown in this plan.'],
    ['Regional auditions and online submissions may be included based on the casting requirement.', 'Studio access or online joining details are shared during onboarding, based on the selected plan.'],
    ['Membership does not guarantee auditions, callbacks, selection, employment, shoots or income.', 'Availability, rescheduling and cancellations follow the studio’s published policies.']
  ],
  'public/assets/final-v15-9-payment-result.js': [
    ['urgent-casting-invoice-', 'dropbeat-dance-studio-invoice-']
  ],
  'public/assets/final-v16-2-payment-result.js': [
    ['urgent-casting-invoice-', 'dropbeat-dance-studio-invoice-']
  ],
  'public/payment-success.html': [
    ['Verified dance class updates delivered on WhatsApp', 'Dance memberships, schedules and studio updates']
  ],
  'public/payment-failed.html': [
    ['Verified dance class updates delivered on WhatsApp', 'Dance memberships, schedules and studio updates']
  ],
  'public/checkout.html': [
    ['name="preferred_dance style"', 'name="preferred_role"'],
    ['Dancer, fresher, character dance style...', 'Hip Hop, Bharatanatyam, Freestyle...']
  ],
  'public/assets/final-v5-theme-article.js': [
    ['Audition update not found', 'Dance tip not found'],
    ["p.title||'Audition update'", "p.title||'Dance tip'"]
  ],
  'public/admin/admin.js': [
    ['Audition Update', 'Dance Tip'],
    ['No auditions have been loaded yet. Create your first audition above.', 'No dance tips have been loaded yet. Create your first dance tip above.'],
    ['Audition update saved:', 'Dance tip saved:'],
    ['Delete this audition update?', 'Delete this dance tip?'],
    ['This audition update will be deleted permanently and cannot be recovered.', 'This dance tip will be deleted permanently and cannot be recovered.'],
    ["res.vendorUserId||'urgent-casting'", "res.vendorUserId||'dropbeat-dance-studio'"],
    ['POST audition update content', 'POST dance-tip content'],
    ['Audition Updates screen', 'Dance Tips screen']
  ],
  'public/admin/last-touchups.js': [
    ['Never miss the right audition update again', 'Find the right dance class for your rhythm'],
    ['DropBeat Dance Studio helps actors receive verified casting updates directly on WhatsApp.', 'DropBeat Dance Studio brings online and studio dance classes, workshops and memberships together.'],
    ['Casting updates on WhatsApp', 'Dance classes for every level'],
    ['Daily Audition Updates', 'Dance Tips'],
    ['Load Audition Updates', 'Load Dance Tips'],
    ['Post New Audition Update', 'Post New Dance Tip'],
    ['Audition Title', 'Dance Tip Title'],
    ['audition-updates-whatsapp-group', 'dance-rhythm-practice-tips'],
    ['audition, casting, whatsapp group', 'dance tips, technique, rhythm'],
    ['Audition Details', 'Dance Tip Content'],
    ['Write the audition/update details normally.', 'Write the dance tip normally.'],
    ['Post Audition Update', 'Post Dance Tip'],
    ['Add Advertisements to This Audition Update', 'Add Advertisements to This Dance Tip'],
    ['this audition update needs ads', 'this dance tip needs ads'],
    ['Post With Advertisements', 'Post Dance Tip With Advertisements'],
    ['Existing Auditions', 'Existing Dance Tips'],
    ['Audition update posted', 'Dance tip posted'],
    ['Audition update saved', 'Dance tip saved'],
    ['Audition update could not be saved.', 'Dance tip could not be saved.'],
    ['Audition Update', 'Dance Tip'],
    ['No auditions have been loaded yet. Create your first audition above.', 'No dance tips have been loaded yet. Create your first dance tip above.']
  ],
  'public/admin/final-v9-invoice-statements-gmail.js': [
    ['We look forward to delivering more audition updates directly to your phone and seeing you shine bright on screen.', 'We look forward to helping you build technique, rhythm and confidence in every class.'],
    ['UC-INV-', 'DB-INV-'],
    ['urgent-casting-invoice-', 'dropbeat-dance-studio-invoice-'],
    ['urgent-casting-statement-', 'dropbeat-dance-studio-statement-']
  ],
  'public/admin/final-v6-maps-favorites.js': [
    ['urgent-casting-favorites-', 'dropbeat-dance-studio-favorites-']
  ],
  'public/admin/final-v16-99-visitors-email-studio.js': [
    ['urgent-casting-', 'dropbeat-dance-studio-']
  ],
  'public/admin/final-profile-media-polish.js': [
    ['YouTube audition clips, showreels or work links submitted with this profile.', 'YouTube dance clips or optional links submitted with this profile.']
  ],
  'public/admin/final-v16-50-integration-guidance-seo-snapchat.js': [
    ['For urgent-casting.com it should be <strong>https://dance-class-at2.pages.dev/api/admin/blogger-oauth/callback</strong>.', 'For DropBeat Dance Studio it should use your public website hostname followed by <strong>/api/admin/blogger-oauth/callback</strong>.']
  ],
  'public/admin/final-v16-8-social-publishing-search.js': [
    ['Automatically submit new Auditions', 'Automatically submit new Dance Tips'],
    ['new Audition URL', 'new Dance Tip URL'],
    ['current public urgent-casting.com article URL', 'current public DropBeat Dance Studio article URL'],
    ['on <code>urgent-casting.com</code>. Do not submit the separate Blogger source hostname such as <code>auditions.urgent-casting.com</code>', 'on your public DropBeat Dance Studio hostname. Do not submit a separate Blogger source hostname']
  ],
  'public/admin/final-v16-46-whatsapp-indexnow-youtube-snapchat.js': [
    ['Example: urgentcasting', 'Example: dropbeatdance'],
    ['Automatically publish new Auditions as Snapchat Stories', 'Automatically publish new Dance Tips as Snapchat Stories']
  ],
  'public/admin/final-v15-admin-workflow-blogger.js': [
    ["'urgent-casting'", "'dropbeat-dance-studio'"]
  ],
  'public/admin/final-v15-2-blogger-sync-settings.js': [
    ['Keep <strong>urgent-casting</strong> unless the developer intentionally changes the integration design.', 'Keep the saved value unless the developer intentionally changes the integration design.'],
    ['urgent-casting', 'dropbeat-dance-studio']
  ],
  'public/admin/final-v15-7-auditions-inquiries-orders.js': [
    ['for an urgent casting requirement today', 'for a dance tip or studio announcement needed today']
  ],
  'public/admin/final-v16-59-inbox-reliability-notifications.js': [
    ['Allow Notifications for urgent-casting.com in browser site settings', 'Allow Notifications for this DropBeat Dance Studio website in browser site settings']
  ],
  'public/admin/final-v16-60-realtime-inbox-comments.js': [
    ['Allow Notifications for urgent-casting.com in the browser site settings', 'Allow Notifications for this DropBeat Dance Studio website in the browser site settings']
  ],
  'public/admin/final-v16-12-social-diagnostics-notifications.js': [
    ['Allow Notifications for urgent-casting.com in the browser site settings', 'Allow Notifications for this DropBeat Dance Studio website in the browser site settings']
  ],
  'public/admin/final-v17-06-email-providers.js': [
    ['Bucket: urgent-casting-email-assets', 'Bucket: dropbeat-dance-studio-email-assets']
  ],
  'functions/api/admin/api-settings.js': [
    ["|| 'urgent-casting'", "|| 'dropbeat-dance-studio'"]
  ],
  'functions/_lib/utils.js': [
    ["settings.vendorUserId || 'urgent-casting'", "settings.vendorUserId || 'dropbeat-dance-studio'"],
    ["local-dev@urgent-casting.local", "local-dev@dropbeat-dance.local"]
  ]
};

for (const [relative, pairs] of Object.entries(exact)) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) source = source.split(from).join(to);
  fs.writeFileSync(file, source);
}

const csvPath = path.join(root, 'public/sample-product-import.csv');
const csv = `sku,name,slug,short_description,description,regular_price,offer_price,badge,eligibility,features,status,placements\nDB-ONLINE,Online Dance Pass,online-dance-pass,Flexible live online dance classes,Coach-led online sessions with weekly schedules and member support,399,199,Online,Beginners and online learners,"Live online dance classes|Class schedule reminders|Beginner-friendly sessions",active,"home,offers"\nDB-STUDIO,Studio Dance Membership,studio-dance-membership,Instructor-led studio dance sessions,Regular studio classes with coaching and priority onboarding,599,349,Popular,All dance levels,"Studio dance classes|Instructor-led sessions|Schedule reminders",active,"home,offers"\nDB-HYBRID,Hybrid Dance Membership,hybrid-dance-membership,Online and studio dance flexibility,Combine online learning with scheduled studio sessions,799,499,Hybrid,Flexible learners,"Online and studio access|Flexible class options|Workshop updates",active,"home,offers"\n`;
fs.writeFileSync(csvPath, csv);

console.log('Active DropBeat interface copy and download filenames normalized.');
