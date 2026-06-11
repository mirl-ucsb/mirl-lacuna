/* exporters.js: ways the register leaves the room, always on the project's
   terms. Every export starts from the public clone: restricted and embargoed
   evidence withheld, locations withheld unless marked safe to publish. The
   one exception is "save project", which is the cataloguer's own working
   file and keeps everything. */

LC.Exporters = (function () {
  const S = LC.state;
  const U = LC.util;

  /* ---------- the working file (everything; sealed when locked) ---------- */
  async function saveProject() {
    const name = U.slug(S.project.title) + '.lacuna.json';
    let text = JSON.stringify(LC.Model.serialize(false), null, 2);
    if (LC.Lock.active()) {
      try { text = await LC.Lock.seal(text); }
      catch (e) { return U.toast('Could not encrypt the file'); }
    }
    U.downloadText(name, text, 'application/json');
    U.toast('Project saved: ' + name + (LC.Lock.active() ? ' (locked)' : ''));
  }

  /* ---------- public data (consent applied) ---------- */
  function publicJSON() {
    const name = U.slug(S.project.title) + '-public.json';
    U.downloadText(name, JSON.stringify(LC.Model.serialize(true), null, 2), 'application/json');
    U.toast('Public data saved: ' + name);
  }

  /* ---------- the register as a spreadsheet ---------- */
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function registerCSV() {
    const pub = LC.Model.publicClone();
    const head = ['id', 'title', 'parallel_titles', 'creator', 'date', 'medium', 'originating_collection',
      'status', 'certainty', 'loss_event', 'extent_amount', 'extent_unit',
      'last_seen_date', 'last_seen_place', 'last_seen_source',
      'narrative', 'tags', 'place', 'latitude', 'longitude', 'location_precision',
      'public_evidence', 'surviving_copies', 'relations'];
    const rows = pub.records.map(r => {
      const titles = (r.titles || []).filter(t => t.text && t.text.trim());
      const loc = r.location || {};
      const hasCoords = typeof loc.lat === 'number' && typeof loc.lon === 'number';
      const ev = r.eventId && (pub.project.events || []).find(x => x.id === r.eventId);
      return [
        r.id,
        titles.length ? titles[0].text : '',
        titles.slice(1).map(t => t.text).join(' | '),
        r.creator, r.date, r.medium, r.origin,
        LC.vocab.statusOf(r.status).label,
        r.certainty,
        ev ? ev.name : '',
        (r.extent && typeof r.extent.amount === 'number') ? r.extent.amount : '',
        (r.extent && r.extent.unit) || '',
        r.lastSeen.date, r.lastSeen.place, r.lastSeen.source,
        r.note,
        (r.tags || []).join(' | '),
        loc.place || '',
        hasCoords ? loc.lat : '',
        hasCoords ? loc.lon : '',
        hasCoords || loc.place ? loc.publish : '',
        (r.evidence || []).length,
        (r.copies || []).map(c => [c.institution, c.identifier].filter(Boolean).join(': ')).filter(Boolean).join(' | '),
        (r.relations || []).map(x => LC.vocab.relationOf(x.type).label.toLowerCase() + ' ' + x.target).join(' | '),
      ].map(csvCell).join(',');
    });
    /* BOM so spreadsheets read Arabic and accents correctly */
    const csv = '\ufeff' + head.join(',') + '\n' + rows.join('\n') + '\n';
    const name = U.slug(S.project.title) + '-register.csv';
    U.downloadText(name, csv, 'text/csv;charset=utf-8');
    U.toast('Register saved: ' + name);
  }

  /* ---------- the finding aid: one self-contained page ---------- */
  async function inlineCSS() {
    let css = '';
    try { css = await (await fetch('css/style.css')).text(); } catch (e) { return ''; }
    /* carry the fonts along as data, so the single file stands alone */
    const names = [];
    css.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (m, n) => { names.push(n); return m; });
    try {
      const datas = {};
      for (const n of names) {
        const buf = await (await fetch('fonts/' + n)).arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        datas[n] = 'data:font/woff2;base64,' + btoa(bin);
      }
      css = css.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (m, n) => 'url("' + datas[n] + '")');
    } catch (e) {
      /* no fonts to be had (file:// perhaps): fall back to system faces */
      css = css.replace(/@font-face\s*\{[^}]*\}/g, '');
    }
    return css;
  }

  const STATIC_JS = [
    'function show(h){',
    "  var m=/^#\\/entry\\/(.+)$/.exec(h||'');",
    "  var view=m?'entry':(h==='#/statistics'?'statistics':(h==='#/atlas'?'atlas':(h==='#/timeline'?'timeline':(h==='#/index'?'index':'register'))));",
    "  ['register','entry','timeline','statistics','atlas','index'].forEach(function(v){",
    "    var s=document.getElementById('v-'+v);",
    "    if(s)s.classList.toggle('hidden',v!==view);",
    "    var b=document.querySelector('nav.folio button[data-view=\"'+v+'\"]');",
    "    if(b)b.classList.toggle('on',v===view);",
    '  });',
    "  document.querySelectorAll('#v-entry .one').forEach(function(d){d.classList.add('hidden');});",
    '  if(m){var d=document.getElementById(\'r-\'+m[1]);if(d)d.classList.remove(\'hidden\');}',
    '  window.scrollTo(0,0);',
    '}',
    "window.addEventListener('hashchange',function(){show(location.hash);});",
    "document.addEventListener('click',function(e){",
    "  var v=e.target.closest('nav.folio button[data-view]');",
    "  if(v){location.hash='#/'+v.getAttribute('data-view');return;}",
    "  var t=e.target.closest('[data-id]');",
    "  if(t&&!e.target.closest('a')){location.hash='#/entry/'+t.getAttribute('data-id');}",
    '});',
    'show(location.hash);',
  ].join('\n');

  async function findingAid() {
    U.toast('Composing the finding aid…');
    const pub = LC.Model.publicClone();
    const p = pub.project;
    const css = await inlineCSS();
    const e = U.esc;
    const kept = [p.compiler, p.institution].filter(Boolean).join(', ');
    const today = new Date();
    const dateLine = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let body = '';
    body += '<header class="app"><div class="plate"><h1>' + e(p.title || 'Untitled register') + '</h1>' +
      '<span class="tag">' + e(p.subtitle || 'a register of absent works') + '</span></div></header>';
    body += '<nav class="folio"><div class="views">' +
      '<button class="view on" data-view="register"><span class="fol">Fol. I</span>Register</button>' +
      '<button class="view" data-view="timeline"><span class="fol">Fol. II</span>Timeline</button>' +
      '<button class="view" data-view="statistics"><span class="fol">Fol. III</span>Statistics</button>' +
      '<button class="view" data-view="atlas"><span class="fol">Fol. IV</span>Atlas</button>' +
      '<button class="view" data-view="index"><span class="fol">Fol. V</span>Index</button>' +
      '</div></nav>';

    const heldBack = LC.Model.heldBackCount();
    body += '<main><section class="view" id="v-register"><div class="sheet">';
    body += '<div class="frontmatter"><div class="fm-line">A register of absent works' + (kept ? ' · kept by ' + e(kept) : '') + '</div>';
    if (p.note) body += '<p class="hint" style="max-width:760px;margin-top:14px">' + e(p.note) + '</p>';
    if (heldBack) body += '<div class="fm-line" style="margin-top:8px">' + heldBack +
      (heldBack === 1 ? ' further entry is' : ' further entries are') +
      ' recorded in the working register and not published here</div>';
    if (p.contact) body += '<div class="fm-line" style="margin-top:8px">Contact · ' + e(p.contact) + '</div>';
    body += '</div>';
    body += '<div class="countline">' + pub.records.length + (pub.records.length === 1 ? ' entry' : ' entries') + ' · ' + e(dateLine) + '</div>';
    body += LC.Register.tableHTML(pub.records, { static: true });
    body += '</div></section>';

    body += '<section class="view hidden" id="v-entry"><div class="sheet narrow">';
    body += '<div style="margin:36px 0 0"><a href="#/register" style="font-family:var(--mono);font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);text-decoration:none">‹ Register</a></div>';
    pub.records.forEach(r => {
      body += '<div class="one tombstone-wrap hidden" id="r-' + e(r.id) + '">' +
        LC.Tombstone.html(r, { static: true, publicOnly: true, project: p, records: pub.records }) + '</div>';
    });
    body += '</div></section>';

    body += '<section class="view hidden" id="v-timeline"><div class="sheet narrow">' +
      LC.Timeline.html(pub, { publicOnly: true }) + '</div></section>';
    body += '<section class="view hidden" id="v-statistics"><div class="sheet narrow">' +
      LC.Stats.html(pub, { publicOnly: true }) + '</div></section>';
    body += '<section class="view hidden" id="v-atlas"><div class="sheet">' +
      LC.Atlas.html(pub, { publicOnly: true }) + '</div></section>';
    body += '<section class="view hidden" id="v-index"><div class="sheet narrow">' +
      LC.Indexes.html(pub, { publicOnly: true }) + '</div></section>';
    body += '</main>';

    body += '<footer style="padding:50px 44px 60px;text-align:center">' +
      '<div class="fm-line" style="margin:0">Compiled ' + e(dateLine) +
      ' · restricted evidence and unpublished places are withheld from this document</div>' +
      '<div class="fm-line" style="margin-top:8px">Made with MIRL Lacuna · Material / Image Research Lab, UC Santa Barbara</div></footer>';

    const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + e(p.title || 'Untitled register') + '</title>\n' +
      '<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body +
      '\n<script>\n' + STATIC_JS + '\n</' + 'script>\n</body>\n</html>\n';

    const name = U.slug(p.title) + '-finding-aid.html';
    U.downloadText(name, html, 'text/html;charset=utf-8');
    U.toast('Finding aid saved: ' + name);
  }

  /* ---------- the memorial book: composed for paper ----------
     A cover leaf from the front matter, one notice per page, and the
     register and index as appendices. Consent applies as in every export;
     the browser's print dialog turns it into a PDF. */
  function printBook() {
    const pub = LC.Model.publicClone();
    const p = pub.project;
    const e = U.esc;
    if (!pub.records.length) {
      return U.toast('Nothing is marked publish yet; the book would be empty');
    }
    const heldBack = LC.Model.heldBackCount();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const kept = [p.compiler, p.institution].filter(Boolean).join(', ');

    let h = '<div class="book-page"><div class="book-cover"><div class="inner">' +
      '<div class="kind">A register of absent works</div>' +
      '<h1>' + e(p.title || 'Untitled register') + '</h1>' +
      (p.subtitle ? '<div class="sub">' + e(p.subtitle) + '</div>' : '') +
      '<hr>' +
      (kept ? '<div class="kept">kept by ' + e(kept) + '</div>' : '') +
      (p.note ? '<div class="scope">' + e(p.note) + '</div>' : '') +
      '<div class="foot"><div>' + pub.records.length + (pub.records.length === 1 ? ' entry' : ' entries') + ' · ' + e(today) + '</div>' +
      (heldBack ? '<div>' + heldBack + (heldBack === 1 ? ' further entry is' : ' further entries are') + ' recorded and not published here</div>' : '') +
      '<div>made with MIRL Lacuna · Material / Image Research Lab, UC Santa Barbara</div></div>' +
      '</div></div></div>';

    pub.records.forEach(r => {
      h += '<div class="book-page tombstone-wrap">' +
        LC.Tombstone.html(r, { static: true, publicOnly: true, project: p, records: pub.records }) + '</div>';
    });

    h += '<div class="book-page"><h2 class="appendix">Appendix I · The register</h2>' +
      LC.Register.tableHTML(pub.records, { static: true }) + '</div>';
    h += '<div class="book-page"><h2 class="appendix">Appendix II · Index</h2>' +
      LC.Indexes.html(pub, { publicOnly: true }).replace('<h2 class="head">Index</h2>', '') + '</div>';

    let book = document.getElementById('book');
    if (!book) {
      book = document.createElement('div');
      book.id = 'book';
      document.body.append(book);
    }
    book.innerHTML = h;
    document.body.classList.add('book-mode');
    const cleanup = () => {
      document.body.classList.remove('book-mode');
      book.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    U.toast('Composing the book… choose Save as PDF in the print dialog');
    setTimeout(() => window.print(), 150);
  }

  /* ---------- a notice for circulation: the searching counterpart ----------
     One entry as a printable appeal: what it was, when it was last seen,
     whom to tell. Evidence consent and place publication apply as ever;
     the cataloguer chooses to circulate it, so a held-back entry may print,
     with a reminder. */
  function printNotice(r) {
    if (!r) return U.toast('Open an entry first');
    const p = S.project;
    const e = U.esc;
    const st = LC.vocab.statusOf(r.status);
    const title = LC.Model.title(r);
    const alts = LC.Model.altTitles(r);
    const photo = (r.evidence || []).find(x => x.consent === 'public' && x.thumb);
    const seen = [r.lastSeen.date, r.lastSeen.place].filter(s => s && s.trim()).join(', ');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const contact = p.contact || p.compiler || p.institution || '';

    let h = '<div class="book-page"><div class="notice-poster"><div class="inner">';
    h += '<div class="np-head">Notice · sought</div>';
    h += '<h1' + (U.isRTL(title) ? ' dir="rtl"' : '') + '>' + e(title) + '</h1>';
    alts.forEach(a => {
      h += '<div class="np-alt"' + (U.isRTL(a.text) ? ' dir="rtl"' : '') + '>' + e(a.text) + '</div>';
    });
    const vital = [r.creator, r.medium, r.date].filter(s => s && s.trim()).join(' · ');
    if (vital) h += '<div class="np-vital">' + e(vital) + '</div>';
    if (photo) h += '<img class="np-img" src="' + photo.thumb + '" alt="">';
    h += '<div class="np-status"><span class="mark ' + st.cls + '">' + e(st.label) + '</span></div>';
    if (seen) h += '<div class="np-seen">Last seen ' + e(seen) +
      (r.lastSeen.source ? ', <span style="font-style:italic">' + e(r.lastSeen.source) + '</span>' : '') + '</div>';
    if (r.extent && typeof r.extent.amount === 'number') {
      h += '<div class="np-seen">' + r.extent.amount.toLocaleString('en-US') + ' ' + e(r.extent.unit || 'items') + '</div>';
    }
    h += '<hr class="np-rule">';
    h += '<div class="np-ask">If you know anything of it, however small:</div>';
    if (contact) h += '<div class="np-contact">' + e(contact) + '</div>';
    h += '<div class="np-foot">' + e(p.title || 'Untitled register') + ' · entry ' + e(r.id) + ' · ' + e(today) + '</div>';
    h += '</div></div></div>';

    let book = document.getElementById('book');
    if (!book) {
      book = document.createElement('div');
      book.id = 'book';
      document.body.append(book);
    }
    book.innerHTML = h;
    document.body.classList.add('book-mode');
    const cleanup = () => {
      document.body.classList.remove('book-mode');
      book.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    if (!r.publish) U.toast('This entry is held back; the notice still honours evidence consent');
    setTimeout(() => window.print(), 150);
  }

  return { saveProject, publicJSON, registerCSV, findingAid, printBook, printNotice };
})();
