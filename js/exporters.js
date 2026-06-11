/* exporters.js: ways the register leaves the room, always on the project's
   terms. Every export starts from the public clone: restricted and embargoed
   evidence withheld, locations withheld unless marked safe to publish. The
   one exception is "save project", which is the cataloguer's own working
   file and keeps everything. */

LC.Exporters = (function () {
  const S = LC.state;
  const U = LC.util;

  /* ---------- the working file (everything) ---------- */
  function saveProject() {
    const name = U.slug(S.project.title) + '.lacuna.json';
    U.downloadText(name, JSON.stringify(LC.Model.serialize(false), null, 2), 'application/json');
    U.toast('Project saved: ' + name);
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
      'status', 'certainty', 'last_seen_date', 'last_seen_place', 'last_seen_source',
      'narrative', 'tags', 'place', 'latitude', 'longitude', 'public_evidence', 'surviving_copies'];
    const rows = pub.records.map(r => {
      const titles = (r.titles || []).filter(t => t.text && t.text.trim());
      const loc = r.location || {};
      const hasCoords = typeof loc.lat === 'number' && typeof loc.lon === 'number';
      return [
        r.id,
        titles.length ? titles[0].text : '',
        titles.slice(1).map(t => t.text).join(' | '),
        r.creator, r.date, r.medium, r.origin,
        LC.vocab.statusOf(r.status).label,
        r.certainty,
        r.lastSeen.date, r.lastSeen.place, r.lastSeen.source,
        r.note,
        (r.tags || []).join(' | '),
        loc.place || '',
        hasCoords ? loc.lat : '',
        hasCoords ? loc.lon : '',
        (r.evidence || []).length,
        (r.copies || []).map(c => [c.institution, c.identifier].filter(Boolean).join(': ')).filter(Boolean).join(' | '),
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
    "  var view=m?'entry':(h==='#/statistics'?'statistics':(h==='#/atlas'?'atlas':'register'));",
    "  ['register','entry','statistics','atlas'].forEach(function(v){",
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
      '<button class="view" data-view="statistics"><span class="fol">Fol. II</span>Statistics</button>' +
      '<button class="view" data-view="atlas"><span class="fol">Fol. III</span>Atlas</button>' +
      '</div></nav>';

    body += '<main><section class="view" id="v-register"><div class="sheet">';
    body += '<div class="frontmatter"><div class="fm-line">A register of absent works' + (kept ? ' · kept by ' + e(kept) : '') + '</div>';
    if (p.note) body += '<p class="hint" style="max-width:760px;margin-top:14px">' + e(p.note) + '</p>';
    if (p.contact) body += '<div class="fm-line" style="margin-top:8px">Contact · ' + e(p.contact) + '</div>';
    body += '</div>';
    body += '<div class="countline">' + pub.records.length + (pub.records.length === 1 ? ' entry' : ' entries') + ' · ' + e(dateLine) + '</div>';
    body += LC.Register.tableHTML(pub.records, { static: true });
    body += '</div></section>';

    body += '<section class="view hidden" id="v-entry"><div class="sheet narrow">';
    body += '<div style="margin:36px 0 0"><a href="#/register" style="font-family:var(--mono);font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);text-decoration:none">‹ Register</a></div>';
    pub.records.forEach(r => {
      body += '<div class="one tombstone-wrap hidden" id="r-' + e(r.id) + '">' +
        LC.Tombstone.html(r, { static: true, publicOnly: true, project: p }) + '</div>';
    });
    body += '</div></section>';

    body += '<section class="view hidden" id="v-statistics"><div class="sheet narrow">' +
      LC.Stats.html(pub, { publicOnly: true }) + '</div></section>';
    body += '<section class="view hidden" id="v-atlas"><div class="sheet">' +
      LC.Atlas.html(pub, { publicOnly: true }) + '</div></section>';
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

  return { saveProject, publicJSON, registerCSV, findingAid };
})();
