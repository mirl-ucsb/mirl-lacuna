/* record.js: one entry of the register, in two registers of its own.
   Above, the memorial notice: the entry as it will be published, set inside
   a mourning frame, dignified, not a 404. Below, the cataloguer's desk:
   the working form whose every keystroke updates the notice above it.
   The notice renderer is a pure function over data so the static finding
   aid can reuse it unchanged. */

/* ---------- the memorial notice ---------- */
LC.Tombstone = (function () {
  const U = LC.util;

  function dirAttr(s) { return U.isRTL(s) ? ' dir="rtl"' : ''; }

  /* the public handle of a narrator; identities stay in the working file */
  function aliasOf(sourceId, p) {
    if (!sourceId) return '';
    const s = ((p && p.sources) || []).find(x => x.id === sourceId);
    return s ? (s.alias || 'a source') : '';
  }

  function fileMeta(e) {
    const bits = [];
    if (e.file && e.file.name) {
      let s = e.file.name;
      if (e.file.size) s += ' (' + Math.max(1, Math.round(e.file.size / 1024)) + ' KB)';
      bits.push(U.esc(s));
    }
    if (e.url) bits.push('<a href="' + U.esc(e.url) + '" target="_blank" rel="noopener">' + U.esc(e.url) + '</a>');
    if (e.archived) bits.push('<a href="' + U.esc(e.archived) + '" target="_blank" rel="noopener">archived copy</a>');
    if (e.sha256) bits.push('<span title="sha-256 ' + U.esc(e.sha256) + '">sha-256 ' + U.esc(e.sha256.slice(0, 16)) + '…</span>');
    if (e.rights) bits.push(U.esc(e.rights));
    return bits.join(' · ');
  }

  function evidenceHTML(r, opts) {
    const p = opts.project || LC.state.project;
    const all = r.evidence || [];
    const shown = opts.publicOnly ? all.filter(e => e.consent === 'public') : all;
    const withheld = all.length - all.filter(e => e.consent === 'public').length;
    let h = '<div class="ts-sect"><h3>Evidence</h3>';
    if (!shown.length) {
      h += '<div class="none">' + (opts.publicOnly
        ? (all.length ? 'The evidence for this entry is held under restriction.' : 'No public evidence accompanies this entry.')
        : 'No evidence is recorded yet.') + '</div>';
    } else {
      h += '<table class="ev-table">';
      shown.forEach((e, i) => {
        h += '<tr><td class="n">' + (i + 1) + '</td><td class="kind">' + U.esc(e.type) + '</td><td>';
        if (e.label) h += '<div class="ev-label"' + dirAttr(e.label) + '>' + U.esc(e.label) + '</div>';
        const meta = fileMeta(e);
        if (meta) h += '<div class="ev-meta">' + meta + '</div>';
        const alias = aliasOf(e.sourceId, p);
        if (alias) h += '<div class="ev-meta">told by ' + U.esc(alias) + '</div>';
        if (e.note) h += '<div class="ev-note"' + dirAttr(e.note) + '>' + U.esc(e.note) + '</div>';
        if (e.thumb && (!opts.publicOnly || e.consent === 'public')) h += '<img class="ev-thumb" src="' + e.thumb + '" alt="">';
        const lapsed = e.consent === 'embargoed' && e.until && e.until <= new Date().toISOString().slice(0, 10);
        h += '</td><td><span class="consent ' + U.esc(e.consent) + '">' + U.esc(e.consent) +
          (e.consent === 'embargoed' && e.until ? ' until ' + U.esc(e.until) : '') + '</span>' +
          (!opts.publicOnly && lapsed ? '<div class="ev-meta" style="color:var(--stamp)">embargo date has passed: review</div>' : '') +
          (!opts.publicOnly && e.consent !== 'public' ? '<div class="ev-meta">withheld from exports</div>' : '') +
          '</td></tr>';
      });
      h += '</table>';
      if (opts.publicOnly && withheld > 0) {
        h += '<div class="none">' + withheld + (withheld === 1 ? ' further item of evidence is' : ' further items of evidence are') + ' held under restriction.</div>';
      }
    }
    return h + '</div>';
  }

  function copiesHTML(r, opts) {
    const cs = r.copies || [];
    let h = '<div class="ts-sect"><h3>Surviving copies</h3>';
    if (!cs.length) return h + '<div class="none">No surviving copy is recorded.</div></div>';
    h += '<table class="ev-table">';
    cs.forEach((c, i) => {
      h += '<tr><td class="n">' + (i + 1) + '</td><td>';
      const inst = [c.institution, c.identifier].filter(Boolean);
      if (inst.length) h += '<div class="ev-label">' + U.esc(inst[0]) + (inst[1] ? ' <span style="font-family:var(--mono);font-size:13px;color:var(--ink-2)">' + U.esc(inst[1]) + '</span>' : '') + '</div>';
      const links = [];
      if (c.iiif) links.push('<a href="' + U.esc(c.iiif) + '" target="_blank" rel="noopener">IIIF</a>');
      if (c.url) links.push('<a href="' + U.esc(c.url) + '" target="_blank" rel="noopener">' + U.esc(c.url) + '</a>');
      if (links.length) h += '<div class="ev-meta">' + links.join(' · ') + '</div>';
      if (c.note) h += '<div class="ev-note"' + dirAttr(c.note) + '>' + U.esc(c.note) + '</div>';
      h += '</td><td style="text-align:right">';
      if (!opts.static && (c.iiif || c.url)) {
        h += '<button class="act" data-look="' + U.esc(c.id) + '">Look</button>';
      }
      h += '</td></tr><tr class="copy-viewer-row" data-viewer-for="' + U.esc(c.id) + '" style="display:none"><td colspan="3"></td></tr>';
    });
    return h + '</table></div>';
  }

  /* dated reports about the thing: the dossier that holds contradiction */
  function sightingsHTML(r, opts) {
    const p = opts.project || LC.state.project;
    const xs = r.sightings || [];
    if (!xs.length) return '';
    let h = '<div class="ts-sect"><h3>Sightings and reports</h3><table class="ev-table">';
    xs.forEach((x, i) => {
      const alias = aliasOf(x.sourceId, p);
      h += '<tr><td class="kind" style="width:120px;padding-top:13px">' + U.esc(x.date || 'undated') + '</td><td>';
      h += '<div class="ev-label">' + U.esc(x.kind) + (x.place ? ' · ' + U.esc(x.place) : '') + '</div>';
      const meta = [alias ? 'told by ' + U.esc(alias) : ''].filter(Boolean).join(' · ');
      if (meta) h += '<div class="ev-meta">' + meta + '</div>';
      if (x.note) h += '<div class="ev-note"' + dirAttr(x.note) + '>' + U.esc(x.note) + '</div>';
      h += '</td><td><span class="bearing ' + U.esc(x.bearing) + '">' + U.esc(x.bearing) + '</span></td></tr>';
    });
    return h + '</table></div>';
  }

  /* relations on this entry, plus computed inverses of relations pointing
     at it from elsewhere in the register */
  function relationLines(r, opts) {
    const all = opts.records || LC.state.records;
    const lines = [];
    (r.relations || []).forEach(x => {
      const t = all.find(o => o.id === x.target);
      if (t) lines.push({ label: LC.vocab.relationOf(x.type).label, rec: t });
    });
    all.forEach(o => {
      if (o.id === r.id) return;
      (o.relations || []).forEach(x => {
        if (x.target === r.id) {
          const inv = LC.vocab.relationOf(LC.vocab.relationOf(x.type).inverse);
          lines.push({ label: inv.label, rec: o });
        }
      });
    });
    return lines;
  }

  function relationsHTML(r, opts) {
    const lines = relationLines(r, opts);
    if (!lines.length) return '';
    let h = '<div class="ts-sect"><h3>In relation</h3><table class="ev-table">';
    lines.forEach(l => {
      h += '<tr><td class="kind" style="width:110px;padding-top:13px">' + U.esc(l.label) + '</td>' +
        '<td><a class="rel-link" href="#/entry/' + U.esc(l.rec.id) + '">' +
        '<span style="font-family:var(--mono);font-size:12.5px;color:var(--stamp)">' + U.esc(l.rec.id) + '</span>  ' +
        U.esc(LC.Model.title(l.rec)) + '</a>' +
        (l.rec.struck ? ' <span class="consent restricted">struck</span>' : '') + '</td></tr>';
    });
    return h + '</table></div>';
  }

  function html(r, opts) {
    opts = opts || {};
    const p = opts.project || LC.state.project;
    const st = LC.vocab.statusOf(r.status);
    const cert = LC.vocab.certaintyOf(r.certainty);
    const title = LC.Model.title(r);
    const alts = LC.Model.altTitles(r);

    let h = '<div class="tombstone"><div class="inner">';
    h += '<div class="ts-top"><div class="ts-no">Entry ' + U.esc(r.id) + '</div>' +
      '<div class="ts-stamp"><span class="mark ' + st.cls + '">' + U.esc(st.label) + '</span>' +
      (r.struck ? '<span class="mark st-struck">Struck from the register</span>' : '') +
      (!opts.static && !r.struck && !r.publish ? '<span class="mark st-struck">Held back from publication</span>' : '') +
      '</div></div>';
    h += '<h2 class="ts-title"' + dirAttr(title) + '>' + U.esc(title) + '</h2>';
    alts.forEach(a => {
      h += '<div class="ts-title-alt"' + dirAttr(a.text) + (a.lang ? ' lang="' + U.esc(a.lang) + '"' : '') + '>' + U.esc(a.text) + '</div>';
    });
    const vital = [r.creator, r.medium, r.date].filter(s => s && s.trim()).join(' · ');
    if (vital) h += '<div class="ts-vital">' + U.esc(vital) + '</div>';
    h += '<hr class="ts-rule">';

    h += '<dl class="ts-fields">';
    const row = (dt, dd) => dd ? '<div class="ts-row"><dt>' + dt + '</dt><dd>' + dd + '</dd></div>' : '';
    h += row('Originating collection', U.esc(r.origin));
    if (r.extent && typeof r.extent.amount === 'number') {
      h += row('Extent', r.extent.amount.toLocaleString('en-US') + (r.extent.unit ? ' ' + U.esc(r.extent.unit) : ''));
    }
    h += row('Condition of record', '<span class="cert"><span class="pt">' + cert.pt + '</span>' + cert.label + '</span> · ' + U.esc(st.label.toLowerCase()));
    if ((r.statusHistory || []).length) {
      const past = r.statusHistory.map(x =>
        U.esc(LC.vocab.statusOf(x.status).label.toLowerCase()) +
        (x.until ? ', to ' + U.esc(x.until) : '') +
        (x.reason ? ' <span style="font-style:italic">(' + U.esc(x.reason) + ')</span>' : '')).join(' · ');
      h += row('Formerly', '<span class="cert" style="font-style:normal">' + past + '</span>');
    }
    const seen = [r.lastSeen.date, r.lastSeen.place].filter(s => s && s.trim()).join(', ');
    h += row('Last seen', U.esc(seen) + (r.lastSeen.source ? (seen ? ' · ' : '') + '<span style="font-style:italic">' + U.esc(r.lastSeen.source) + '</span>' : ''));
    const ev = r.eventId && (p.events || []).find(x => x.id === r.eventId);
    if (ev && (ev.name || ev.date)) {
      h += row('Loss event', U.esc(ev.name || 'unnamed event') + (ev.date ? ' <span style="font-style:italic">(' + U.esc(ev.date) + ')</span>' : ''));
    }
    const loc = r.location || {};
    const hasCoords = typeof loc.lat === 'number' && typeof loc.lon === 'number';
    if (loc.place || hasCoords) {
      const fmt = (lat, lon) => '<span style="font-family:var(--mono);font-size:13.5px">' +
        Math.abs(lat).toFixed(3) + (lat >= 0 ? ' N' : ' S') + ', ' +
        Math.abs(lon).toFixed(3) + (lon >= 0 ? ' E' : ' W') + '</span>';
      if (opts.publicOnly && loc.publish === 'withheld') {
        /* withheld in public documents */
      } else {
        let v = U.esc(loc.place || '');
        if (hasCoords) v += (v ? ' · ' : '') + fmt(loc.lat, loc.lon);
        if (loc.publish === 'approximate') v += ' <span style="font-style:italic">(approximate)</span>';
        if (!opts.publicOnly && loc.publish === 'withheld') v += ' <span class="consent restricted">not for publication</span>';
        h += row('Place of last record', v);
      }
    }
    h += '</dl>';

    if (r.note && r.note.trim()) {
      h += '<div class="ts-note"' + dirAttr(r.note) + '>' +
        r.note.trim().split(/\n\s*\n|\n/).map(p => '<p>' + U.esc(p) + '</p>').join('') + '</div>';
    }
    if (r.tags && r.tags.length) {
      h += '<div class="ts-tags">' + r.tags.map(U.esc).join(' · ') + '</div>';
    }

    h += evidenceHTML(r, opts);
    h += sightingsHTML(r, opts);
    h += copiesHTML(r, opts);
    h += relationsHTML(r, opts);

    /* the footnote: how to cite this entry */
    if (opts.static) {
      h += '<div class="ts-sect cite-block"><h3>Cite this entry</h3>' +
        '<div class="cite-out">' + LC.Citation.build(r, p, 'chicago').html + '</div></div>';
    } else {
      h += '<div class="ts-sect cite-block"><h3>Cite this entry</h3>' +
        '<div class="cite-row"><select id="cite-style">' +
        '<option value="chicago">Chicago (note)</option><option value="mla">MLA</option>' +
        '<option value="apa">APA</option><option value="bibtex">BibTeX</option></select>' +
        '<button class="act" id="cite-copy">Copy</button></div>' +
        '<div class="cite-out" id="cite-out"></div></div>';
    }

    h += '</div></div>';
    return h;
  }

  return { html };
})();

/* ---------- the working record page ---------- */
LC.Record = (function () {
  const S = LC.state;
  const U = LC.util;
  let current = null;       /* the record being shown */
  let citeStyle = 'chicago';
  let viewers = [];         /* open OpenSeadragon instances */

  /* ----- IIIF: find a deep-zoomable source at an address ----- */
  async function tileSourceFor(c) {
    const u = (c.iiif || c.url || '').trim();
    if (!u) throw new Error('No address to look at.');
    if (/\.(jpe?g|png|gif|webp|bmp)(\?|#|$)/i.test(u)) return { type: 'image', url: u };
    if (/info\.json(\?|#|$)/i.test(u)) return u;
    const res = await fetch(u, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('The address did not answer (' + res.status + ').');
    const j = await res.json();
    const ctx = JSON.stringify(j['@context'] || '');
    if (j.protocol === 'http://iiif.io/api/image' || /api\/image/.test(ctx) ||
        (j.width && j.height && (j['@id'] || j.id))) return j;
    let svc = null;
    try { svc = j.sequences[0].canvases[0].images[0].resource.service; } catch (e) {}
    if (!svc) try {
      const body = j.items[0].items[0].items[0].body;
      svc = (body.service && body.service[0]) || null;
    } catch (e) {}
    if (svc) {
      const id = svc['@id'] || svc.id;
      if (id) return id.replace(/\/info\.json$/, '') + '/info.json';
    }
    throw new Error('No IIIF image was found at that address.');
  }

  function closeViewers() {
    viewers.forEach(v => { try { v.destroy(); } catch (e) {} });
    viewers = [];
  }

  async function toggleLook(copy, btn) {
    const row = document.querySelector('tr[data-viewer-for="' + copy.id + '"]');
    if (!row) return;
    if (row.style.display !== 'none') { row.style.display = 'none'; row.firstElementChild.innerHTML = ''; return; }
    row.style.display = '';
    const cell = row.firstElementChild;
    cell.innerHTML = '';
    const host = U.h('div', { class: 'copy-viewer' });
    const osd = U.h('div', { class: 'osd' });
    const closer = U.h('button', { class: 'btn closer', onclick: () => { row.style.display = 'none'; cell.innerHTML = ''; } }, 'Close');
    host.append(osd, closer);
    cell.append(host);
    try {
      const ts = await tileSourceFor(copy);
      const v = OpenSeadragon({
        element: osd, tileSources: ts, prefixUrl: '',
        showNavigationControl: false, crossOriginPolicy: 'Anonymous',
        gestureSettingsMouse: { scrollToZoom: true, clickToZoom: false },
      });
      viewers.push(v);
    } catch (e) {
      cell.innerHTML = '';
      cell.append(U.h('div', { class: 'hint', style: { padding: '12px 0', fontStyle: 'italic' } },
        'Could not open it: ' + (e.message || e) + ' The source may not allow cross-origin viewing; try the link itself.'));
    }
  }

  /* ----- wire the interactive parts of a freshly rendered notice ----- */
  function wireTombstone(r) {
    const host = document.getElementById('tombstone-host');
    const sel = host.querySelector('#cite-style');
    const out = host.querySelector('#cite-out');
    const copy = host.querySelector('#cite-copy');
    const renderCite = () => { out.innerHTML = LC.Citation.build(r, S.project, citeStyle).html; };
    if (sel) {
      sel.value = citeStyle;
      sel.addEventListener('change', () => { citeStyle = sel.value; renderCite(); });
      renderCite();
    }
    if (copy) copy.addEventListener('click', () => {
      const text = LC.Citation.build(r, S.project, citeStyle).text;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => U.toast('Citation copied'))
        .catch(() => {
          const ta = U.h('textarea', null, text);
          document.body.append(ta); ta.select();
          try { document.execCommand('copy'); U.toast('Citation copied'); } catch (e) { U.toast('Select and copy it by hand'); }
          ta.remove();
        });
    });
    host.querySelectorAll('button[data-look]').forEach(b => {
      const c = (r.copies || []).find(x => x.id === b.dataset.look);
      if (c) b.addEventListener('click', () => toggleLook(c, b));
    });
  }

  let refreshTimer = null;
  function refreshTombstone(r, soon) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      const host = document.getElementById('tombstone-host');
      if (!host || current !== r) return;
      closeViewers();
      host.innerHTML = LC.Tombstone.html(r, {});
      wireTombstone(r);
    }, soon ? 0 : 300);
  }

  /* ----- the page ----- */
  function render(id) {
    const sect = document.getElementById('view-entry');
    sect.innerHTML = '';
    closeViewers();
    const r = LC.Model.get(id);
    current = r;

    const sheet = U.h('div', { class: 'sheet narrow' });
    if (!r) {
      sheet.append(
        U.h('h2', { class: 'head' }, 'No entry is open'),
        U.h('p', { class: 'subhead' }, 'Choose an entry from the register, or begin a new one.'),
        U.h('button', { class: 'btn', onclick: () => { location.hash = '#/register'; } }, 'To the register'));
      sect.append(sheet);
      return;
    }

    /* ledger navigation: previous and next entries in the visible order */
    const order = LC.Register.visible();
    const idx = order.findIndex(x => x.id === r.id);
    const navLine = U.h('div', { style: { display: 'flex', gap: '20px', alignItems: 'baseline', margin: '36px 0 0' } },
      U.h('button', { class: 'act', onclick: () => { location.hash = '#/register'; } }, '‹ Register'),
      U.h('span', { style: { flex: '1' } }),
      idx > 0 ? U.h('button', { class: 'act', onclick: () => { location.hash = '#/entry/' + order[idx - 1].id; } }, '‹ Previous') : null,
      idx >= 0 && idx < order.length - 1 ? U.h('button', { class: 'act', onclick: () => { location.hash = '#/entry/' + order[idx + 1].id; } }, 'Next ›') : null);

    const tombHost = U.h('div', { class: 'tombstone-wrap', id: 'tombstone-host' });
    sheet.append(navLine, tombHost);
    sect.append(sheet);

    tombHost.innerHTML = LC.Tombstone.html(r, {});
    wireTombstone(r);

    sect.append(LC.Desk.build(r));
  }

  return { render, refreshTombstone, get current() { return current; } };
})();

/* ---------- the cataloguer's desk ---------- */
LC.Desk = (function () {
  const S = LC.state;
  const U = LC.util;

  /* a labelled underline input bound to a record field */
  function field(r, label, get, set, opts) {
    opts = opts || {};
    const input = opts.textarea
      ? U.h('textarea', { rows: opts.rows || '5', placeholder: opts.ph || '' })
      : U.h('input', { type: opts.type || 'text', value: get() == null ? '' : get(), placeholder: opts.ph || '', dir: 'auto' });
    if (opts.textarea) input.value = get() || '';
    input.addEventListener('input', () => { set(input.value); LC.App.entryChanged(r); });
    const f = U.h('div', { class: 'field' }, U.h('label', null, label), input);
    if (opts.note) f.append(U.h('div', { class: 'note' }, opts.note));
    return f;
  }

  function sect(title, small, ...kids) {
    const h4 = U.h('h4', null, title);
    if (small) h4.append(U.h('small', null, small));
    return U.h('div', { class: 'desk-sect' }, h4, ...kids);
  }

  /* ----- titles ----- */
  function titlesSect(r) {
    const box = U.h('div');
    const redraw = () => {
      box.innerHTML = '';
      r.titles.forEach((t, i) => {
        const text = U.h('input', { type: 'text', value: t.text, dir: 'auto', style: { flex: '1' }, placeholder: i ? 'Parallel title' : 'Title of the work' });
        text.addEventListener('input', () => { t.text = text.value; LC.App.entryChanged(r); });
        const lang = U.h('input', { type: 'text', value: t.lang, placeholder: 'lang', title: 'Language code, e.g. en, ar', style: { width: '64px', fontFamily: 'var(--mono)', fontSize: '13px' } });
        lang.addEventListener('input', () => { t.lang = lang.value.trim(); LC.App.entryChanged(r); });
        const row = U.h('div', { style: { display: 'flex', gap: '14px', alignItems: 'baseline', marginBottom: '12px' } }, text, lang);
        if (r.titles.length > 1) row.append(U.h('button', { class: 'act', onclick: () => { r.titles.splice(i, 1); LC.App.entryChanged(r, true); redraw(); } }, 'Remove'));
        box.append(row);
      });
    };
    redraw();
    const add = U.h('div', { class: 'add-line' },
      U.h('button', { class: 'act', onclick: () => { r.titles.push({ text: '', lang: '' }); redraw(); } }, '+ Add a parallel title'));
    return sect('Titles', 'in any language; right-to-left scripts set themselves', box, add);
  }

  /* ----- status and certainty; a change of fate is kept, not overwritten ----- */
  function statusSect(r) {
    const histBox = U.h('div');
    const drawHistory = () => {
      histBox.innerHTML = '';
      if (!(r.statusHistory || []).length) return;
      const wrap = U.h('div', { class: 'field' }, U.h('label', null, 'Formerly'));
      r.statusHistory.forEach((x, i) => {
        const reason = U.h('input', { type: 'text', value: x.reason || '', placeholder: 'why it changed', style: { flex: '1' } });
        reason.addEventListener('input', () => { x.reason = reason.value; LC.App.entryChanged(r); });
        wrap.append(U.h('div', { style: { display: 'flex', gap: '14px', alignItems: 'baseline', marginBottom: '10px' } },
          U.h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12.5px', color: 'var(--ink-2)', whiteSpace: 'nowrap' } },
            LC.vocab.statusOf(x.status).label + (x.until ? ' · to ' + x.until : '')),
          reason,
          U.h('button', { class: 'act', onclick: () => { r.statusHistory.splice(i, 1); LC.App.entryChanged(r, true); drawHistory(); } }, 'Remove')));
      });
      wrap.append(U.h('div', { class: 'note' }, 'Former fates stay on the record; give each a line on why it changed.'));
      histBox.append(wrap);
    };

    const statusPick = U.h('div', { class: 'marks-pick' });
    LC.vocab.STATUS.forEach(st => {
      const b = U.h('button', { class: 'mark ' + st.cls + (r.status === st.key ? ' on' : '') }, st.label);
      b.addEventListener('click', () => {
        if (r.status !== st.key) LC.Model.setStatus(r, st.key);
        statusPick.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        drawHistory();
        LC.App.entryChanged(r, true);
      });
      statusPick.append(b);
    });
    const certPick = U.h('div', { class: 'marks-pick', style: { marginTop: '14px' } });
    LC.vocab.CERTAINTY.forEach(c => {
      const b = U.h('button', { class: 'mark st-unlocated' + (r.certainty === c.key ? ' on' : '') }, c.pt + ' ' + c.label);
      b.addEventListener('click', () => {
        r.certainty = c.key;
        certPick.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        LC.App.entryChanged(r, true);
      });
      certPick.append(b);
    });
    const evBox = U.h('div', { class: 'field' });
    const drawEvent = () => {
      evBox.innerHTML = '';
      evBox.append(U.h('label', null, 'Loss event'));
      const evSel = U.h('select', null,
        U.h('option', { value: '' }, 'no event'),
        ...(S.project.events || []).map(ev =>
          U.h('option', { value: ev.id, selected: r.eventId === ev.id ? '' : null },
            (ev.name || 'unnamed event') + (ev.date ? ' (' + ev.date + ')' : ''))));
      evSel.addEventListener('change', () => { r.eventId = evSel.value || null; LC.App.entryChanged(r); });
      const newName = U.h('input', { type: 'text', placeholder: 'or name a new event…', style: { flex: '1' }, dir: 'auto' });
      const add = U.h('button', {
        class: 'act', onclick: () => {
          const name = newName.value.trim();
          if (!name) return U.toast('Give the event a name first');
          const ev = LC.Model.addEvent();
          ev.name = name;
          r.eventId = ev.id;
          LC.App.entryChanged(r, true);
          drawEvent();
          U.toast('Event added and assigned; its date and note live on the Timeline folio');
        },
      }, '+ Add');
      newName.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add.click(); } });
      evBox.append(evSel,
        U.h('div', { style: { display: 'flex', gap: '14px', alignItems: 'baseline', marginTop: '10px' } }, newName, add),
        U.h('div', { class: 'note' }, 'Events (a fire, a sale, a flood) gather entries; their dates, places, and notes are kept on the Timeline folio.'));
    };
    drawEvent();
    drawHistory();
    return sect('What became of it', 'status, and how firmly it is known',
      U.h('div', { class: 'field' }, U.h('label', null, 'Status'), statusPick),
      histBox,
      U.h('div', { class: 'field' }, U.h('label', null, 'Certainty'), certPick),
      evBox);
  }

  /* a narrator picker; identities show here, only aliases publish */
  function sourceSelect(value, onchange) {
    const sel = U.h('select', null,
      U.h('option', { value: '' }, 'no source'),
      ...(S.project.sources || []).map(s =>
        U.h('option', { value: s.id, selected: value === s.id ? '' : null },
          (s.alias || '(no alias yet)') + (s.name ? ' · ' + s.name : ''))));
    sel.addEventListener('change', () => onchange(sel.value || null));
    return sel;
  }

  /* ----- evidence ----- */
  function evidenceItem(r, e, i, redraw) {
    const head = U.h('div', { class: 'item-head' },
      U.h('span', { class: 'n' }, 'Evidence ' + (i + 1)));
    const typeSel = U.h('select', null, ...LC.vocab.EVTYPE.map(t => U.h('option', { value: t, selected: e.type === t ? '' : null }, t)));
    typeSel.addEventListener('change', () => { e.type = typeSel.value; LC.App.entryChanged(r); });
    head.append(typeSel, U.h('span', { class: 'sp' }),
      U.h('button', { class: 'act', onclick: () => { r.evidence.splice(i, 1); LC.App.entryChanged(r, true); redraw(); } }, 'Remove'));

    const item = U.h('div', { class: 'item' }, head);

    item.append(field(r, 'What it is', () => e.label, v => { e.label = v; },
      { ph: 'e.g. Studio ledger, page 41' }));

    /* the file line: attach, hash, thumbnail */
    const fileLine = U.h('div', { class: 'field' });
    const drawFileLine = () => {
      fileLine.innerHTML = '';
      fileLine.append(U.h('label', null, 'File'));
      const row = U.h('div', { style: { display: 'flex', gap: '14px', alignItems: 'baseline', flexWrap: 'wrap' } });
      row.append(U.h('button', {
        class: 'btn', onclick: () => LC.App.pickFile(async file => {
          e.file = { name: file.name, size: file.size, type: file.type };
          U.toast('Hashing ' + file.name + '…');
          try {
            e.sha256 = await LC.Hash.sha256(await file.arrayBuffer());
            e.thumb = await LC.Hash.thumbnail(file);
          } catch (err) { U.toast('Could not hash the file'); }
          LC.App.entryChanged(r, true);
          drawFileLine();
        }),
      }, e.file ? 'Replace file' : 'Attach file'));
      if (e.file && e.file.name) {
        row.append(U.h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12.5px', color: 'var(--ink-2)' } },
          e.file.name + (e.sha256 ? ' · sha-256 ' + e.sha256.slice(0, 12) + '…' : '')));
        if (e.sha256) row.append(U.h('button', {
          class: 'act', title: 'Pick the file again and check it against the recorded fingerprint',
          onclick: () => LC.App.pickFile(async file => {
            U.toast('Hashing ' + file.name + '…');
            try {
              const hash = await LC.Hash.sha256(await file.arrayBuffer());
              U.toast(hash === e.sha256
                ? 'Verified: the file matches the recorded fingerprint'
                : 'MISMATCH: this is not the recorded file');
            } catch (err) { U.toast('Could not hash the file'); }
          }),
        }, 'Verify'));
        row.append(U.h('button', { class: 'act', onclick: () => { e.file = null; e.sha256 = e.url ? e.sha256 : ''; e.thumb = ''; LC.App.entryChanged(r, true); drawFileLine(); } }, 'Detach'));
      }
      fileLine.append(row, U.h('div', { class: 'note' },
        'The file itself stays on your machine; the register keeps its name, a small thumbnail for images, and a sha-256 fingerprint that ties the entry to the exact file.'));
    };
    drawFileLine();
    item.append(fileLine);

    const urlField = field(r, 'Or a web address', () => e.url, v => { e.url = v.trim(); }, { type: 'url', ph: 'https://…' });
    const hashBtn = U.h('button', {
      class: 'act',
      onclick: async () => {
        if (!e.url) return U.toast('Give a web address first');
        U.toast('Fetching to hash…');
        try {
          const buf = await (await fetch(e.url)).arrayBuffer();
          e.sha256 = await LC.Hash.sha256(buf);
          LC.App.entryChanged(r, true);
          U.toast('Hashed: ' + e.sha256.slice(0, 12) + '…');
        } catch (err) { U.toast('Could not fetch it (the source may not allow it)'); }
      },
    }, 'Fetch and hash');
    /* the rescue-archiving gesture: ask the Internet Archive to keep a copy */
    const archInput = U.h('input', { type: 'url', value: e.archived || '', placeholder: 'https://web.archive.org/web/…' });
    archInput.addEventListener('input', () => { e.archived = archInput.value.trim(); LC.App.entryChanged(r); });
    const waybackBtn = U.h('button', {
      class: 'act',
      title: 'Open the Internet Archive and ask it to save this address now',
      onclick: () => {
        if (!e.url) return U.toast('Give a web address first');
        window.open('https://web.archive.org/save/' + e.url, '_blank', 'noopener');
        if (!e.archived) {
          e.archived = 'https://web.archive.org/web/' + e.url;
          archInput.value = e.archived;
          LC.App.entryChanged(r, true);
        }
        U.toast('Snapshot requested; the archived address is kept with the evidence');
      },
    }, 'Request a Wayback snapshot');
    item.append(urlField,
      U.h('div', { style: { display: 'flex', gap: '18px', marginTop: '-8px', marginBottom: '14px', flexWrap: 'wrap' } }, hashBtn, waybackBtn),
      U.h('div', { class: 'field' }, U.h('label', null, 'Archived address'), archInput,
        U.h('div', { class: 'note' }, 'The Wayback address of a saved snapshot, so the evidence survives its source going dark.')));

    const consentSel = U.h('select', null, ...LC.vocab.CONSENT.map(c =>
      U.h('option', { value: c.key, selected: e.consent === c.key ? '' : null }, c.label + ': ' + c.gloss)));
    const untilInput = U.h('input', { type: 'date', value: e.until || '' });
    untilInput.addEventListener('input', () => { e.until = untilInput.value; LC.App.entryChanged(r); });
    const untilField = U.h('div', { class: 'field', style: { display: e.consent === 'embargoed' ? '' : 'none' } },
      U.h('label', null, 'Embargoed until'), untilInput,
      U.h('div', { class: 'note' }, 'Optional. When the date passes, Lacuna points it out; the consent state itself changes only by your hand.'));
    consentSel.addEventListener('change', () => {
      e.consent = consentSel.value;
      untilField.style.display = e.consent === 'embargoed' ? '' : 'none';
      LC.App.entryChanged(r);
    });
    item.append(U.h('div', { class: 'row2' },
      field(r, 'Rights / credit', () => e.rights, v => { e.rights = v; }, { ph: 'e.g. courtesy of the family' }),
      U.h('div', { class: 'field' }, U.h('label', null, 'Consent'), consentSel,
        U.h('div', { class: 'note' }, 'Only public evidence enters exports and the finding aid. Restricted and embargoed material never leaves this file.'))));
    item.append(untilField);

    item.append(U.h('div', { class: 'field' }, U.h('label', null, 'On whose word'),
      sourceSelect(e.sourceId, v => { e.sourceId = v; LC.App.entryChanged(r); }),
      U.h('div', { class: 'note' }, 'Narrators are kept under Project, in Sources and narrators; only their alias is ever published.')));
    item.append(field(r, 'Note', () => e.note, v => { e.note = v; }, { ph: 'who provided it, what it shows' }));
    return item;
  }

  function evidenceSect(r) {
    const box = U.h('div');
    const redraw = () => {
      box.innerHTML = '';
      r.evidence.forEach((e, i) => box.append(evidenceItem(r, e, i, redraw)));
    };
    redraw();
    return sect('Evidence', 'what lets you assert the entry',
      box,
      U.h('div', { class: 'add-line' }, U.h('button', {
        class: 'act', onclick: () => {
          r.evidence.push({ id: U.uid(), type: 'photograph', label: '', file: null, url: '', sha256: '', rights: '', consent: 'restricted', note: '', thumb: '' });
          LC.App.entryChanged(r, true); redraw();
        },
      }, '+ Add evidence')));
  }

  /* ----- surviving copies ----- */
  function copiesSect(r) {
    const box = U.h('div');
    const redraw = () => {
      box.innerHTML = '';
      r.copies.forEach((c, i) => {
        const item = U.h('div', { class: 'item' },
          U.h('div', { class: 'item-head' },
            U.h('span', { class: 'n' }, 'Copy ' + (i + 1)),
            U.h('span', { class: 'sp' }),
            U.h('button', { class: 'act', onclick: () => { r.copies.splice(i, 1); LC.App.entryChanged(r, true); redraw(); } }, 'Remove')));
        item.append(
          U.h('div', { class: 'row2' },
            field(r, 'Institution / holder', () => c.institution, v => { c.institution = v; }, { ph: 'who holds the copy' }),
            field(r, 'Identifier', () => c.identifier, v => { c.identifier = v; }, { ph: 'shelfmark, accession no.' })),
          field(r, 'IIIF address', () => c.iiif, v => { c.iiif = v.trim(); },
            { type: 'url', ph: 'an info.json or manifest; the notice gets a Look button', note: 'Paste a IIIF image or manifest address and the copy opens as a deep-zoom image in the notice above.' }),
          field(r, 'Web address', () => c.url, v => { c.url = v.trim(); }, { type: 'url', ph: 'catalogue page or plain image' }),
          field(r, 'Note', () => c.note, v => { c.note = v; }, { ph: 'e.g. a print from the lost negative' }));
        box.append(item);
      });
    };
    redraw();
    return sect('Surviving copies', 'where some version of it still exists',
      box,
      U.h('div', { class: 'add-line' }, U.h('button', {
        class: 'act', onclick: () => {
          r.copies.push({ id: U.uid(), institution: '', identifier: '', iiif: '', url: '', note: '' });
          LC.App.entryChanged(r, true); redraw();
        },
      }, '+ Add a surviving copy')));
  }

  /* ----- sightings: dated reports, supporting or complicating the fate ----- */
  function sightingsSect(r) {
    const box = U.h('div');
    const redraw = () => {
      box.innerHTML = '';
      r.sightings.forEach((x, i) => {
        const kindSel = U.h('select', null, ...LC.vocab.SIGHTKIND.map(k =>
          U.h('option', { value: k, selected: x.kind === k ? '' : null }, k)));
        kindSel.addEventListener('change', () => { x.kind = kindSel.value; LC.App.entryChanged(r); });
        const bearingPick = U.h('div', { class: 'marks-pick' });
        LC.vocab.BEARING.forEach(b => {
          const btn = U.h('button', { class: 'mark st-unlocated' + (x.bearing === b.key ? ' on' : '') }, b.label);
          btn.addEventListener('click', () => {
            x.bearing = b.key;
            bearingPick.querySelectorAll('button').forEach(y => y.classList.toggle('on', y === btn));
            LC.App.entryChanged(r);
          });
          bearingPick.append(btn);
        });
        const item = U.h('div', { class: 'item' },
          U.h('div', { class: 'item-head' },
            U.h('span', { class: 'n' }, 'Report ' + (i + 1)),
            kindSel,
            U.h('span', { class: 'sp' }),
            U.h('button', { class: 'act', onclick: () => { r.sightings.splice(i, 1); LC.App.entryChanged(r, true); redraw(); } }, 'Remove')),
          U.h('div', { class: 'row2' },
            field(r, 'When', () => x.date, v => { x.date = v; }, { ph: 'e.g. spring 2003' }),
            field(r, 'Where', () => x.place, v => { x.place = v; }, { ph: 'place, as fit to publish' })),
          U.h('div', { class: 'row2' },
            U.h('div', { class: 'field' }, U.h('label', null, 'On whose word'),
              sourceSelect(x.sourceId, v => { x.sourceId = v; LC.App.entryChanged(r); })),
            U.h('div', { class: 'field' }, U.h('label', null, 'Bearing on the status'), bearingPick)),
          field(r, 'Note', () => x.note, v => { x.note = v; }, { ph: 'what was reported' }));
        box.append(item);
      });
    };
    redraw();
    return sect('Sightings and reports', 'the dossier; it may hold contradiction',
      box,
      U.h('div', { class: 'add-line' }, U.h('button', {
        class: 'act', onclick: () => {
          r.sightings.push({ id: U.uid(), date: '', kind: 'seen', bearing: 'supports', place: '', sourceId: null, note: '' });
          LC.App.entryChanged(r, true); redraw();
        },
      }, '+ Add a sighting or report')),
      U.h('div', { class: 'note' },
        'Sightings publish with the entry, under their narrators’ aliases. What must stay private belongs in the investigation log below.'));
  }

  /* ----- the investigation log: the search itself, dated; never exported ----- */
  function logSect(r) {
    const box = U.h('div');
    const redraw = () => {
      box.innerHTML = '';
      r.log.forEach((x, i) => {
        const date = U.h('input', { type: 'text', value: x.date || '', placeholder: 'date', style: { width: '120px', fontFamily: 'var(--mono)', fontSize: '13px' } });
        date.addEventListener('input', () => { x.date = date.value; LC.App.entryChanged(r); });
        const note = U.h('input', { type: 'text', value: x.note || '', placeholder: 'what was tried, who was asked, what came back', style: { flex: '1' }, dir: 'auto' });
        note.addEventListener('input', () => { x.note = note.value; LC.App.entryChanged(r); });
        box.append(U.h('div', { style: { display: 'flex', gap: '14px', alignItems: 'baseline', marginBottom: '12px' } },
          date, note,
          U.h('button', { class: 'act', onclick: () => { r.log.splice(i, 1); LC.App.entryChanged(r, true); redraw(); } }, 'Remove')));
      });
    };
    redraw();
    return sect('Investigation log', 'dated working notes; these never leave the working file',
      box,
      U.h('div', { class: 'add-line' }, U.h('button', {
        class: 'act', onclick: () => {
          r.log.push({ id: U.uid(), date: new Date().toISOString().slice(0, 10), note: '' });
          LC.App.entryChanged(r, true); redraw();
          const inputs = box.querySelectorAll('input[dir="auto"]');
          if (inputs.length) inputs[inputs.length - 1].focus();
        },
      }, '+ Add a note')),
      U.h('div', { class: 'note' },
        'Negative results are findings: the deposit with no list, the office that says no file exists. Kept out of every export and the finding aid.'));
  }

  /* ----- relations: typed links; the other side is computed, not stored ----- */
  function relationsSect(r) {
    const box = U.h('div');
    const candidates = x => {
      const list = S.records.filter(o => o.id !== r.id && !o.struck);
      if (x && x.target && !list.some(o => o.id === x.target)) {
        const t = LC.Model.get(x.target);
        if (t) list.push(t);
      }
      return list;
    };
    const redraw = () => {
      box.innerHTML = '';
      r.relations.forEach((x, i) => {
        const typeSel = U.h('select', null, ...LC.vocab.RELATION.map(v =>
          U.h('option', { value: v.key, selected: x.type === v.key ? '' : null }, v.label)));
        typeSel.addEventListener('change', () => { x.type = typeSel.value; LC.App.entryChanged(r); });
        const tgtSel = U.h('select', { style: { flex: '1', minWidth: '220px' } }, ...candidates(x).map(o =>
          U.h('option', { value: o.id, selected: x.target === o.id ? '' : null },
            o.id + ' · ' + LC.Model.title(o) + (o.struck ? ' (struck)' : ''))));
        tgtSel.addEventListener('change', () => { x.target = tgtSel.value; LC.App.entryChanged(r); });
        box.append(U.h('div', { style: { display: 'flex', gap: '14px', alignItems: 'baseline', marginBottom: '12px', flexWrap: 'wrap' } },
          typeSel, tgtSel,
          U.h('button', { class: 'act', onclick: () => { r.relations.splice(i, 1); LC.App.entryChanged(r, true); redraw(); } }, 'Remove')));
      });
    };
    redraw();
    return sect('In relation', 'typed links to other entries; the other side is implied',
      box,
      U.h('div', { class: 'add-line' }, U.h('button', {
        class: 'act', onclick: () => {
          const list = S.records.filter(o => o.id !== r.id && !o.struck);
          if (!list.length) return U.toast('No other entry to link to yet');
          r.relations.push({ type: 'part-of', target: list[0].id });
          LC.App.entryChanged(r, true); redraw();
        },
      }, '+ Add a relation')));
  }

  /* ----- striking out: a ledger cancels, it does not erase ----- */
  function strikeSect(r) {
    if (!r.struck) {
      return sect('Striking out', null,
        U.h('button', {
          class: 'btn danger', onclick: () => {
            r.struck = true;
            LC.App.entryChanged(r, true);
            U.toast('Entry ' + r.id + ' struck: it stays as a cancelled line');
            LC.Record.render(r.id);
            window.scrollTo(0, 0);
          },
        }, 'Strike this entry from the register'),
        U.h('div', { class: 'note', style: { marginTop: '10px' } },
          'A struck entry stays in the ledger as a cancelled line: visible here, kept out of every export, restorable at any time. Its number is never reused. If the loss itself should stay on record, change the status instead.'));
    }
    return sect('Struck out', 'this entry is a cancelled line',
      U.h('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap' } },
        U.h('button', {
          class: 'btn', onclick: () => {
            r.struck = false;
            LC.App.entryChanged(r, true);
            U.toast('Entry ' + r.id + ' restored to the register');
            LC.Record.render(r.id);
            window.scrollTo(0, 0);
          },
        }, 'Restore this entry'),
        U.h('button', {
          class: 'btn danger', onclick: () => {
            if (confirm('Remove entry ' + r.id + ' from the project entirely? Unlike striking, this cannot be undone.')) {
              LC.Model.remove(r.id);
              LC.Store.save();
              U.toast('Entry ' + r.id + ' removed from the project');
              location.hash = '#/register';
            }
          },
        }, 'Remove it outright')),
      U.h('div', { class: 'note', style: { marginTop: '10px' } },
        'Restoring returns the entry to the register and its exports. Removing it outright erases it from the project file: for mistaken entries, not for losses.'));
  }

  /* ----- the whole desk ----- */
  function build(r) {
    const desk = U.h('div', { class: 'desk' });
    desk.append(U.h('div', { class: 'desk-head' },
      U.h('h3', null, 'The cataloguer’s desk'),
      U.h('span', { class: 'hint' }, 'everything you set here appears in the notice above, as you type')));

    desk.append(titlesSect(r));

    desk.append(sect('The work itself', null,
      U.h('div', { class: 'row2' },
        field(r, 'Creator / maker', () => r.creator, v => { r.creator = v; }, { ph: 'who made it' }),
        field(r, 'Date of the work', () => r.date, v => { r.date = v; }, { ph: 'e.g. 1934, or 1930s' })),
      U.h('div', { class: 'row2' },
        field(r, 'Medium', () => r.medium, v => { r.medium = v; }, { ph: 'e.g. gelatin silver print' }),
        field(r, 'Originating archive / collection', () => r.origin, v => { r.origin = v; }, { ph: 'where it belonged' })),
      U.h('div', { class: 'row2' },
        field(r, 'Extent: how many', () => r.extent.amount == null ? '' : r.extent.amount,
          v => { const n = parseFloat(String(v).replace(/[, ]/g, '')); r.extent.amount = isFinite(n) ? n : null; },
          { ph: 'e.g. 1140', note: 'For collection-level entries, so statistics can count objects, not just entries.' }),
        field(r, 'Extent: of what', () => r.extent.unit, v => { r.extent.unit = v; }, { ph: 'e.g. glass plates, albums' }))));

    desk.append(statusSect(r));

    desk.append(sect('Last seen', 'the most recent moment anyone can vouch for',
      U.h('div', { class: 'row2' },
        field(r, 'When', () => r.lastSeen.date, v => { r.lastSeen.date = v; }, { ph: 'e.g. March 1976' }),
        field(r, 'Where', () => r.lastSeen.place, v => { r.lastSeen.place = v; }, { ph: 'place' })),
      field(r, 'On whose word', () => r.lastSeen.source, v => { r.lastSeen.source = v; }, { ph: 'the source: a witness, a catalogue, a photograph' })));

    desk.append(sightingsSect(r));

    const loc = r.location;
    const locPick = U.h('div', { class: 'marks-pick' });
    LC.vocab.LOCPUB.forEach(lp => {
      const b = U.h('button', { class: 'mark st-unlocated' + (loc.publish === lp.key ? ' on' : ''), title: lp.gloss, 'data-pub': lp.key }, lp.label);
      b.addEventListener('click', () => {
        loc.publish = lp.key;
        locPick.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        LC.App.entryChanged(r, true);
      });
      locPick.append(b);
    });

    /* coordinates: typed by hand, or filled from a place name (below) */
    const latInput = U.h('input', { type: 'text', value: loc.lat == null ? '' : loc.lat, placeholder: 'e.g. 34.42' });
    const lonInput = U.h('input', { type: 'text', value: loc.lon == null ? '' : loc.lon, placeholder: 'e.g. -119.70' });
    const onManual = () => {
      const a = parseFloat(latInput.value), b = parseFloat(lonInput.value);
      loc.lat = isFinite(a) ? a : null; loc.lon = isFinite(b) ? b : null;
      r._coordsManual = true;            /* the cataloguer set these; do not overwrite */
      setGeoNote('', '');
      LC.App.entryChanged(r);
    };
    latInput.addEventListener('input', onManual);
    lonInput.addEventListener('input', onManual);

    /* the place name, which can populate the Atlas on its own */
    const geoNote = U.h('div', { class: 'note' });
    function setGeoNote(msg, kind) {
      geoNote.innerHTML = '';
      geoNote.style.color = kind === 'match' ? 'var(--blue)' : (kind === 'miss' ? 'var(--stamp)' : '');
      if (msg) geoNote.append(msg);
    }
    function applyMatch(m, precise) {
      const round = precise ? (x => Math.round(x * 1e5) / 1e5) : (x => Math.round(x * 100) / 100);
      loc.lat = round(m.lat); loc.lon = round(m.lon);
      latInput.value = loc.lat; lonInput.value = loc.lon;
      r._coordsManual = false;
      LC.App.entryChanged(r, true);
    }
    const placeInput = U.h('input', { type: 'text', value: loc.place || '', dir: 'auto',
      placeholder: 'a town, or "Institute of Palestine Studies, Beirut"' });
    let geoTimer = null;
    const tryLocal = () => {
      if (!window.LC || !LC.Geocode) return;
      if (r._coordsManual && (loc.lat != null || loc.lon != null)) {
        setGeoNote('Coordinates were entered by hand; clear them to match from the place name.', '');
        return;
      }
      const m = LC.Geocode.resolveLocal(loc.place);
      if (m) {
        applyMatch(m, false);
        setGeoNote('On the atlas: ' + LC.Geocode.describe(m) + ' · approximate. Choose Approximate or Exact below to publish it.', 'match');
      } else if (loc.place.trim()) {
        setGeoNote('No place matched offline. Look it up online, or type coordinates.', 'miss');
      } else {
        setGeoNote('', '');
      }
    };
    placeInput.addEventListener('input', () => {
      loc.place = placeInput.value;
      LC.App.entryChanged(r);
      clearTimeout(geoTimer); geoTimer = setTimeout(tryLocal, 350);
    });

    const onlineBtn = U.h('button', {
      class: 'act', title: 'Ask OpenStreetMap to resolve this exact place',
      onclick: async () => {
        if (!loc.place.trim()) return U.toast('Type a place first');
        setGeoNote('Looking up online…', '');
        try {
          const m = await LC.Geocode.lookupOnline(loc.place);
          applyMatch(m, true);
          setGeoNote('Found online: ' + m.label, 'match');
          U.toast('Place found; coordinates set');
        } catch (e) { setGeoNote(e.message || 'The lookup failed.', 'miss'); }
      },
    }, 'Look up online');

    desk.append(sect('Place', 'type a place and it lands on the atlas; no coordinates by hand',
      U.h('div', { class: 'field' }, U.h('label', null, 'Place name'), placeInput, geoNote),
      U.h('div', { class: 'add-line' }, onlineBtn,
        U.h('span', { class: 'note', style: { marginLeft: '14px' } },
          'Offline matching stays on your machine. The online lookup sends the place name to OpenStreetMap, only when you press it.')),
      U.h('div', { class: 'row2' },
        U.h('div', { class: 'field' }, U.h('label', null, 'Latitude'), latInput),
        U.h('div', { class: 'field' }, U.h('label', null, 'Longitude'), lonInput)),
      U.h('div', { class: 'field' },
        U.h('label', null, 'Publication of this place'), locPick,
        U.h('div', { class: 'note' },
          'Withheld by default: locations can endanger people and sites. Approximate publishes the place rounded to about 10 km, findable but not targetable. Exact publishes it precisely.'))));
    if (loc.place && loc.place.trim()) setTimeout(tryLocal, 0);

    const pubBox = U.h('input', { type: 'checkbox' });
    pubBox.checked = !!r.publish;
    pubBox.addEventListener('change', () => { r.publish = pubBox.checked; LC.App.entryChanged(r, true); });
    desk.append(sect('Publication', 'whether this entry leaves the working register at all',
      U.h('div', { class: 'field' },
        U.h('label', { class: 'inline', style: { fontFamily: 'var(--serif)', textTransform: 'none', letterSpacing: '0' } },
          pubBox, 'Publish this entry'),
        U.h('div', { class: 'note' },
          'Off by default. Until you tick it, the whole entry stays out of the finding aid, the spreadsheet, and the public data: catalogued and counted, but held back. The finding aid states how many entries are held.'))));

    desk.append(sect('Narrative note', 'what is known, in your own words',
      field(r, 'Note', () => r.note, v => { r.note = v; }, { textarea: true, rows: '6', ph: 'What it was, how it was lost, who remembers it, what remains unknown.' })));

    const tagsInput = U.h('input', { type: 'text', value: (r.tags || []).join(', '), placeholder: 'comma-separated, e.g. portraits, glass plates' });
    tagsInput.addEventListener('input', () => {
      r.tags = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean);
      LC.App.entryChanged(r);
    });
    desk.append(sect('Tags', null, U.h('div', { class: 'field' }, U.h('label', null, 'Tags'), tagsInput)));

    desk.append(evidenceSect(r));
    desk.append(copiesSect(r));
    desk.append(relationsSect(r));
    desk.append(logSect(r));

    desk.append(strikeSect(r));

    return desk;
  }

  return { build };
})();
