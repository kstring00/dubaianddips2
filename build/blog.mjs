/* The blog: Markdown posts in /content/blog with frontmatter, rendered with
   marked. Posts with draft: true are built only when VERCEL_ENV is not
   "production" (preview deployments and local builds), carry noindex and
   a draft banner there, and never reach the production site, the index
   or the sitemap. */
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { ROOT, CFG, SITE, PROD, READY, esc, abs, page, crumbs, star, breadcrumbs, faqPage, organization, ORG_ID } from './lib.mjs';
import { orderBtn, connections, imgSize, img } from './pages.mjs';

const DIR = path.join(ROOT, 'content', 'blog');
const REQUIRED = ['title', 'description', 'slug', 'date', 'targetKeyword', 'heroImage', 'heroAlt'];

/* Frontmatter: key: value, [a, b] lists, and "- item" lists. */
function frontmatter(src) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (!m) return [{}, src];
  const data = {}; let key = null;
  for (const line of m[1].split('\n')) {
    const li = /^\s+-\s+(.*)$/.exec(line);
    if (li && key) { (data[key] = Array.isArray(data[key]) ? data[key] : []).push(unq(li[1])); continue; }
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    key = kv[1]; const v = kv[2].trim();
    if (v === '') data[key] = [];
    else if (/^\[.*\]$/.test(v)) data[key] = v.slice(1, -1).split(',').map(x => unq(x.trim())).filter(Boolean);
    else if (v === 'true' || v === 'false') data[key] = v === 'true';
    else data[key] = unq(v);
  }
  return [data, src.slice(m[0].length)];
}
const unq = s => s.replace(/^["']|["']$/g, '');

/* heading ids: the same for the rendered heading (HTML, with entities) and
   the contents rail (plain text) */
const slugify = s => s.replace(/&(#39|#x27|quot|rsquo|lsquo|ldquo|rdquo);/g, '').replace(/&amp;/g, '&').replace(/['’‘"“”]/g, '')
  .toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const words = s => (s.replace(/<[^>]+>/g, ' ').match(/[A-Za-z0-9’']+/g) || []).length;

export function loadPosts() {
  if (!fs.existsSync(DIR)) return [];
  const all = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).map(f => {
    const [fm, md] = frontmatter(fs.readFileSync(path.join(DIR, f), 'utf8'));
    for (const k of REQUIRED) if (!fm[k]) throw new Error(`${f}: frontmatter is missing "${k}"`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.slug)) throw new Error(`${f}: slug must be lowercase and hyphenated`);
    return { ...fm, file: f, md, draft: fm.draft === true, related: fm.related || [], category: fm.category || 'Guides', updated: fm.updated || fm.date };
  });
  /* newest first; a post marked featured: true leads the index */
  return all.filter(p => !(PROD && p.draft)).sort((a, b) => (b.featured === true) - (a.featured === true) || b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

/* Split the body into the article and its FAQ ("## Frequently asked
   questions", then "### question" + answer paragraphs). */
function render(post) {
  const tokens = marked.lexer(post.md);
  let faqAt = tokens.findIndex(t => t.type === 'heading' && t.depth === 2 && /frequently asked questions/i.test(t.text));
  const main = faqAt < 0 ? tokens : tokens.slice(0, faqAt);
  const faqTokens = faqAt < 0 ? [] : tokens.slice(faqAt + 1);
  const faqs = [];
  for (const t of faqTokens) {
    if (t.type === 'heading' && t.depth === 3) faqs.push({ q: t.text, parts: [] });
    else if (faqs.length && t.type !== 'space') faqs[faqs.length - 1].parts.push(t);
  }
  faqs.forEach(f => {
    const list = f.parts; list.links = tokens.links;
    f.a = marked.parser(list).trim();
    f.aText = f.a.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  });
  /* The mid-post Order CTA goes before the H2 nearest the middle. */
  const h2s = main.map((t, i) => t.type === 'heading' && t.depth === 2 ? i : -1).filter(i => i > 0);
  const midAt = h2s.length > 1 ? h2s[Math.floor(h2s.length / 2)] : -1;
  const before = main.slice(0, midAt < 0 ? main.length : midAt), after = midAt < 0 ? [] : main.slice(midAt);
  before.links = after.links = tokens.links;
  const html = marked.parser(before) + (midAt < 0 ? '' : '\n<!--mid-cta-->\n' + marked.parser(after));
  const headings = main.filter(t => t.type === 'heading' && t.depth === 2).map(t => t.text);
  return { html, faqs, headings, words: words(marked.parser(main.slice())) + faqs.reduce((n, f) => n + words(f.a), 0) };
}

/* Headings get ids so the contents rail can link to them. */
marked.use({ renderer: { heading({ tokens, depth }) { const text = this.parser.parseInline(tokens); return `<h${depth} id="${slugify(text.replace(/<[^>]+>/g, ''))}">${text}</h${depth}>\n`; } } });

const ctaBlock = where => `<aside class="pcta" aria-label="Order ahead">
  <div class="pcta__pass" aria-hidden="true"><span>DXB</span><i>&rarr;</i><span>HOU</span></div>
  <div class="pcta__copy"><p class="pcta__k">Now boarding</p><p class="pcta__t">Order ahead and it is ready when you walk in.</p></div>
  ${orderBtn(CFG.COPY.pickupCta || 'Order ahead for pickup', 'post-' + where)}
</aside>`;
const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

function card(p, { big = false, i = 0 } = {}) {
  const [w, h] = imgSize(p.heroImage);
  return `<article class="pcard${big ? ' pcard--big' : ''} rv" data-cat="${esc(p.category)}" style="--i:${i}">
  <a class="pcard__link" href="/blog/${p.slug}">
    <figure class="pcard__img">${img(p.heroImage, p.heroAlt, w, h, { lazy: !big, sizes: big ? '(min-width: 900px) 55vw, 100vw' : '(min-width: 900px) 30vw, 100vw' })}</figure>
    <div class="pcard__body">
      <p class="pcard__meta"><span>${esc(p.category)}</span><span>${p.readMin} min read</span>${p.draft ? '<span class="pcard__draft">Draft</span>' : ''}</p>
      <h${big ? 2 : 3} class="pcard__title">${esc(p.title)}</h${big ? 2 : 3}>
      <p class="pcard__desc">${esc(p.description)}</p>
      <span class="pcard__go">Read the guide <i aria-hidden="true">&rarr;</i></span>
    </div>
  </a>
</article>`;
}

export function buildBlog() {
  const posts = loadPosts().map(p => { const r = render(p); return { ...p, ...r, readMin: Math.max(1, Math.round(r.words / 220)) }; });
  const bySlug = Object.fromEntries(posts.map(p => [p.slug, p]));
  const out = {};

  /* /blog */
  const trail = [{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog' }];
  const cats = [...new Set(posts.map(p => p.category))];
  const [feat, ...rest] = posts;
  const indexBody = `<header class="phero phero--blog">
  <div class="shell phero__grid">
    <div class="phero__copy">
      ${crumbs(trail)}
      <p class="eyebrow rv">${star()}<span>The flight log</span></p>
      <h1 class="phero__title" data-lines>Dessert guides from <em>Clear Lake.</em></h1>
      <p class="phero__lead rv">Notes from our dessert shop in Clear Lake, Houston: what Dubai chocolate is, which frappe to order, and how to feed a whole office.</p>
    </div>
  </div>
</header>
${posts.length ? `<section class="blogidx" aria-label="Posts">
  <div class="shell">
    ${cats.length > 1 ? `<div class="bfilter rv" role="group" aria-label="Filter by category"><button type="button" aria-pressed="true" data-filter="*">All</button>${cats.map(c => `<button type="button" aria-pressed="false" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${card(feat, { big: true })}
    ${rest.length ? `<div class="pgrid">${rest.map((p, i) => card(p, { i })).join('')}</div>` : ''}
    <p class="bfilter__none" hidden>No posts in that category yet.</p>
  </div>
</section>` : `<section class="blogidx blogidx--empty">
  <div class="shell"><div class="bempty rv"><p class="eyebrow">${star()}<span>Boarding soon</span></p><h2>The first guides are being written.</h2><p>Until they land, the <a href="/menu">menu</a> and the <a href="/visit">shop</a> are open.</p></div></div>
</section>`}
${connections([['/menu', 'MENU', 'The whole menu', 'Ten routes, from Dubai chocolate to kunafa.'], ['/visit', 'HOU', 'Visit the shop', 'Hours, parking and directions.'], ['/catering', 'GRP', 'Catering', 'Frappes and desserts for a group.']])}`;
  out['blog/index.html'] = page({
    path: '/blog', current: '/blog', bodyClass: 'p-blog', noindex: !posts.some(p => !p.draft),
    title: 'Dessert Guides from Clear Lake, Houston | Dubai & Dips Blog',
    description: 'Guides from Dubai & Dips in Clear Lake, Houston: Dubai chocolate explained, which frappe to order, late-night dessert and ordering for the office.',
    jsonld: [breadcrumbs(trail), { '@type': 'Blog', '@id': SITE + '/blog#blog', name: 'Dubai & Dips blog', url: SITE + '/blog', publisher: { '@id': ORG_ID },
      blogPost: posts.filter(p => !p.draft).map(p => ({ '@type': 'BlogPosting', headline: p.title, url: SITE + '/blog/' + p.slug, datePublished: p.date })) }, organization()],
    body: indexBody
  });

  /* /blog/<slug> */
  for (const p of posts) {
    const t = [...trail, { name: p.title, url: '/blog/' + p.slug }];
    const related = (p.related.length ? p.related.map(s => bySlug[s]).filter(Boolean) : posts.filter(x => x.slug !== p.slug)).filter(x => x.slug !== p.slug).slice(0, 3);
    const [w, h] = imgSize(p.heroImage);
    const toc = p.headings.length > 2 ? `<nav class="ptoc" aria-label="In this guide"><p class="ptoc__h">In this guide</p><ol>${p.headings.map(hd => `<li><a href="#${slugify(hd)}">${esc(hd)}</a></li>`).join('')}</ol></nav>` : '';
    const body = `<article class="post">
  <header class="post__head">
    <div class="shell post__headin">
      ${crumbs(t)}
      <p class="eyebrow rv">${star()}<span>${esc(p.category)} &middot; ${p.readMin} min read</span></p>
      <h1 class="post__title" data-lines>${esc(p.h1 || p.title)}</h1>
      <p class="post__dek rv">${esc(p.description)}</p>
      <p class="post__meta rv"><span>By Dubai &amp; Dips</span><span>Published <time datetime="${p.date}">${fmtDate(p.date)}</time></span>${p.updated && p.updated !== p.date ? `<span>Updated <time datetime="${p.updated}">${fmtDate(p.updated)}</time></span>` : ''}</p>
    </div>
  </header>
  <figure class="post__hero shell rv">${img(p.heroImage, p.heroAlt, w, h, { lazy: false, sizes: '(min-width: 1200px) 1100px, 100vw' })}</figure>
  <div class="shell post__grid">
    <aside class="post__rail">${toc}<div class="ptrack" aria-hidden="true"><span></span></div></aside>
    <div class="post__body prose">
${p.html.replace('<!--mid-cta-->', ctaBlock('mid'))}
${p.faqs.length ? `<section class="pfaq" aria-labelledby="pfaq-title"><h2 id="pfaq-title">Frequently asked questions</h2>${p.faqs.map(f => `<details class="faq__item"><summary><span>${esc(f.q)}</span><i aria-hidden="true"></i></summary><div class="faq__a">${f.a}</div></details>`).join('')}</section>` : ''}
${ctaBlock('end')}
    </div>
  </div>
</article>
${related.length ? `<section class="related" aria-labelledby="related-title"><div class="shell"><h2 class="connect__title rv" id="related-title">Connecting <em>reads</em></h2><div class="pgrid">${related.map((r, i) => card(r, { i })).join('')}</div></div></section>` : ''}`;
    const ld = [
      { '@type': 'BlogPosting', '@id': SITE + '/blog/' + p.slug + '#post', headline: p.title, description: p.description, image: [abs(p.heroImage)],
        datePublished: p.date, dateModified: p.updated || p.date, author: { '@id': ORG_ID }, publisher: { '@id': ORG_ID },
        mainEntityOfPage: SITE + '/blog/' + p.slug, keywords: p.targetKeyword, wordCount: p.words, inLanguage: 'en-US',
        about: READY[0] ? { '@id': SITE + '/visit/' + READY[0].slug + '#restaurant' } : undefined },
      organization(), breadcrumbs(t)
    ];
    if (p.faqs.length) ld.push(faqPage(p.faqs));
    out[`blog/${p.slug}/index.html`] = page({
      path: '/blog/' + p.slug, current: '/blog', bodyClass: 'p-post', draft: p.draft, noindex: p.draft, ogType: 'article',
      title: p.seoTitle || p.title, description: p.description, image: p.heroImage, imageAlt: p.heroAlt, preloadImage: p.heroImage,
      jsonld: ld, body
    });
  }
  return { files: out, posts };
}
