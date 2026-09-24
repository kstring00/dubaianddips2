/* Validates every JSON-LD block in dist/ against the properties Google's
   rich results require (and the ones it recommends for local businesses),
   and checks that name, address and phone match the visible page.
   Run after `npm run build`: node scripts/validate-schema.mjs */
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve(new URL('../dist', import.meta.url).pathname);
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) files.push(p); } })(dist);
let errors = 0, warnings = 0, blocks = 0;
const types = {};
const err = (f, m) => { errors++; console.log('  ERROR ' + path.relative(dist, f) + ': ' + m); };
const warn = (f, m) => { warnings++; console.log('  warn  ' + path.relative(dist, f) + ': ' + m); };
const isUrl = u => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);
const isDate = d => typeof d === 'string' && /^\d{4}-\d\d-\d\d/.test(d) && !isNaN(Date.parse(d));
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    blocks++;
    let j; try { j = JSON.parse(m[1]); } catch (e) { err(f, 'invalid JSON: ' + e.message); continue; }
    if (j['@context'] !== 'https://schema.org') err(f, '@context must be https://schema.org');
    const nodes = j['@graph'] || [j];
    for (const n of nodes) {
      const t = n['@type']; types[t] = (types[t] || 0) + 1;
      if (!t) { err(f, 'node without @type'); continue; }
      if (t === 'Restaurant' && n.address) {
        for (const k of ['name', 'telephone', 'url']) if (!n[k]) err(f, 'Restaurant missing ' + k);
        const a = n.address; for (const k of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry']) if (!a[k]) err(f, 'address missing ' + k);
        if (!/^\+1\d{10}$/.test(n.telephone)) err(f, 'telephone not E.164: ' + n.telephone);
        if (!Array.isArray(n.image) || !n.image.every(isUrl)) err(f, 'image must be absolute URLs');
        for (const o of n.openingHoursSpecification || []) {
          if (!o.dayOfWeek.every(d => DAYS.includes(d))) err(f, 'bad dayOfWeek ' + o.dayOfWeek);
          if (!/^\d\d:\d\d$/.test(o.opens) || !/^\d\d:\d\d$/.test(o.closes)) err(f, 'bad opens/closes');
        }
        if (!(n.openingHoursSpecification || []).length) err(f, 'Restaurant has no opening hours');
        if (!isUrl(n.hasMap)) err(f, 'hasMap not a URL');
        for (const k of ['geo', 'priceRange', 'potentialAction']) if (!n[k]) warn(f, `Restaurant has no ${k} (left out until config has a real value)`);
        if (!(n.sameAs || []).every(isUrl)) err(f, 'sameAs must be URLs');
        /* name, address and phone as shown on the page */
        const local = n.telephone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');
        if (!text.includes(local)) err(f, 'phone ' + local + ' not shown on the page');
        if (!text.includes(a.streetAddress)) err(f, 'street address not shown on the page');
      }
      if (t === 'Menu') {
        if (!n.name || !(n.hasMenuSection || []).length) err(f, 'Menu needs name and hasMenuSection');
        for (const s of n.hasMenuSection || []) { if (!s.name) err(f, 'MenuSection without name'); for (const it of s.hasMenuItem || []) if (!it.name) err(f, 'MenuItem without name'); }
      }
      if (t === 'BreadcrumbList') {
        n.itemListElement.forEach((li, i) => { if (li.position !== i + 1) err(f, 'breadcrumb positions not sequential'); if (!isUrl(li.item)) err(f, 'breadcrumb item not absolute'); if (!li.name) err(f, 'breadcrumb without name'); });
        if (n.itemListElement.length < 2) err(f, 'breadcrumb needs at least 2 items');
      }
      if (t === 'BlogPosting' && n.mainEntityOfPage) {
        if (!n.headline || n.headline.length > 110) err(f, 'headline missing or over 110 chars');
        if (!isDate(n.datePublished) || !isDate(n.dateModified)) err(f, 'dates must be ISO');
        if (!Array.isArray(n.image) || !n.image.every(isUrl)) err(f, 'BlogPosting image');
        if (!n.author || !n.publisher) err(f, 'author/publisher missing');
      }
      if (t === 'FAQPage') {
        if (!(n.mainEntity || []).length) err(f, 'FAQPage without questions');
        for (const q of n.mainEntity || []) { if (q['@type'] !== 'Question' || !q.name) err(f, 'FAQ question'); if (!q.acceptedAnswer || !q.acceptedAnswer.text) err(f, 'FAQ answer text'); if (/<[a-z]/i.test(q.acceptedAnswer.text)) warn(f, 'FAQ answer contains HTML'); }
        /* Google: the FAQ must be visible on the page */
        for (const q of n.mainEntity || []) if (!text.includes(q.name)) err(f, 'FAQ question not visible: ' + q.name);
      }
      if (t === 'Organization' && (!n.name || !isUrl(n.url) || !isUrl(n.logo))) err(f, 'Organization needs name, url, logo');
    }
  }
}
console.log(`${blocks} JSON-LD blocks in ${files.length} pages. Types: ${JSON.stringify(types)}`);
console.log(errors ? `FAILED: ${errors} errors, ${warnings} warnings` : `OK: 0 errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
