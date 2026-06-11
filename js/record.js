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

  function fileMeta(e) {
    const bits = [];
    if (e.file && e.file.name) {
      let s = e.file.name;
      if (e.file.size) s += ' (' + Math.max(1, Math.round(e.file.size / 1024)) + ' KB)';
      bits.push(U.esc(s));
    }
    if (e.url) bits.push('<a href="' + U.esc(e.url) + '" target="_blank" rel="noopener">' + U.esc(e.url) + '</a>');
    if (e.sha256) bits.push('<span title="sha-256 ' + U.esc(e.sha256) + '">sha-256 ' + U.esc(e.sha256.slice(0, 16)) + '…</span>');
    if (e.rights) bits.push(U.esc(e.rights));
    return bits.join(' · ');
  }

  function evidenceHTML(r, opts) {
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
        if (e.note) h += '<div class="ev-note"' + dirAttr(e.note) + '>' + U.esc(e.note) + '</div>';
        if (e.thumb && (!opts.publicOnly || e.consent === 'public')) h += '<img class="ev-thumb" src="' + e.thumb + '" alt="">';
        h += '</td><td><span class="consent ' + U.esc(e.consent) + '">' + U.esc(e.consent) + '</span>' +
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

  function html(r, opts) {
    opts = opts || {};
    const p = opts.project || LC.state.project;
    const st = LC.vocab.statusOf(r.status);
    const cert = LC.vocab.certaintyOf(r.certainty);
    const title = LC.Model.title(r);
    const alts = LC.Model.altTitles(r);

    let h = '<div class="tombstone"><div class="inner">';
    h += '<div class="ts-top"><div class="ts-no">Entry ' + U.esc(r.id) + '</div>' +
      '<div class="ts-stamp"><span class="mark ' + st.cls + '">' + U.esc(st.label) + '</span></div></div>';
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
    h += row('Condition of record', '<span class="cert"><span class="pt">' + cert.pt + '</span>' + cert.label + '</span> · ' + U.esc(st.label.toLowerCase()));
    const seen = [r.lastSeen.date, r.lastSeen.place].filter(s => s && s.trim()).join(', ');
    h += row('Last seen', U.esc(seen) + (r.lastSeen.source ? (seen ? ' · ' : '') + '<span style="font-style:italic">' + U.esc(r.lastSeen.source) + '</span>' : ''));
    const loc = r.location || {};
    const hasCoords = typeof loc.lat === 'number' && typeof loc.lon === 'number';
    if (loc.place || hasCoords) {
      if (opts.publicOnly && !loc.safe) {
        /* withheld in public documents */
      } else {
        let v = U.esc(loc.place || '');
        if (hasCoords) v += (v ? ' · ' : '') + '<span style="font-family:var(--mono);font-size:13.5px">' +
          Math.abs(loc.lat).toFixed(3) + (loc.lat >= 0 ? ' N' : ' S') + ', ' +
          Math.abs(loc.lon).toFixed(3) + (loc.lon >= 0 ? ' E' : ' W') + '</span>';
        if (!opts.publicOnly && !loc.safe) v += ' <span class="consent restricted">not for publication</span>';
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
    h += copiesHTML(r, opts);

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

  /* ----- status and certainty ----- */
  function statusSect(r) {
    const statusPick = U.h('div', { class: 'marks-pick' });
    LC.vocab.STATUS.forEach(st => {
      const b = U.h('button', { class: 'mark ' + st.cls + (r.status === st.key ? ' on' : '') }, st.label);
      b.addEventListener('click', () => {
        r.status = st.key;
        statusPick.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
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
    return sect('What became of it', 'status, and how firmly it is known',
      U.h('div', { class: 'field' }, U.h('label', null, 'Status'), statusPick),
      U.h('div', { class: 'field' }, U.h('label', null, 'Certainty'), certPick));
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
        row.append(U.h('button', { class: 'act', onclick: () => { e.file = null; e.sha256 = e.url ? e.sha256 : ''; e.thumb = ''; LC.App.entryChanged(r, true); drawFileLine(); } }, 'Detach'));
      }
      fileLine.append(row, U.h('div', { class: 'note' },
        'The file itself stays on your machine; the register keeps its name, a small thumbnail for images, and a sha-256 fingerprint that ties the entry to the exact file.'));
    };
    drawFileLine();
    item.append(fileLine);

    const urlField = field(r, 'Or a web address', () => e.url, v => { e.url = v.trim(); }, { type: 'url', ph: 'https://…' });
    const hashBtn = U.h('button', {
      class: 'act', style: { marginTop: '-8px', marginBottom: '14px' },
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
    item.append(urlField, hashBtn);

    const consentSel = U.h('select', null, ...LC.vocab.CONSENT.map(c =>
      U.h('option', { value: c.key, selected: e.consent === c.key ? '' : null }, c.label + ': ' + c.gloss)));
    consentSel.addEventListener('change', () => { e.consent = consentSel.value; LC.App.entryChanged(r); });
    item.append(U.h('div', { class: 'row2' },
      field(r, 'Rights / credit', () => e.rights, v => { e.rights = v; }, { ph: 'e.g. courtesy of the family' }),
      U.h('div', { class: 'field' }, U.h('label', null, 'Consent'), consentSel,
        U.h('div', { class: 'note' }, 'Only public evidence enters exports and the finding aid. Restricted and embargoed material never leaves this file.'))));

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
        field(r, 'Originating archive / collection', () => r.origin, v => { r.origin = v; }, { ph: 'where it belonged' }))));

    desk.append(statusSect(r));

    desk.append(sect('Last seen', 'the most recent moment anyone can vouch for',
      U.h('div', { class: 'row2' },
        field(r, 'When', () => r.lastSeen.date, v => { r.lastSeen.date = v; }, { ph: 'e.g. March 1976' }),
        field(r, 'Where', () => r.lastSeen.place, v => { r.lastSeen.place = v; }, { ph: 'place' })),
      field(r, 'On whose word', () => r.lastSeen.source, v => { r.lastSeen.source = v; }, { ph: 'the source: a witness, a catalogue, a photograph' })));

    const loc = r.location;
    const safeBox = U.h('input', { type: 'checkbox' });
    safeBox.checked = !!loc.safe;
    safeBox.addEventListener('change', () => { loc.safe = safeBox.checked; LC.App.entryChanged(r, true); });
    desk.append(sect('Place', 'for the atlas; published only with your say-so',
      field(r, 'Place name', () => loc.place, v => { loc.place = v; }, { ph: 'site, town, region' }),
      U.h('div', { class: 'row2' },
        field(r, 'Latitude', () => loc.lat == null ? '' : loc.lat, v => { const n = parseFloat(v); loc.lat = isFinite(n) ? n : null; }, { ph: 'e.g. 34.42' }),
        field(r, 'Longitude', () => loc.lon == null ? '' : loc.lon, v => { const n = parseFloat(v); loc.lon = isFinite(n) ? n : null; }, { ph: 'e.g. -119.70' })),
      U.h('div', { class: 'field' },
        U.h('label', { class: 'inline', style: { fontFamily: 'var(--serif)', textTransform: 'none', letterSpacing: '0' } },
          safeBox, 'Safe to publish this place'),
        U.h('div', { class: 'note' },
          'Off by default. Until you tick it, the place stays out of every export, the finding aid, and the atlas: locations can endanger people and sites.'))));

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

    desk.append(sect('Striking out', null,
      U.h('button', {
        class: 'btn danger', onclick: () => {
          if (confirm('Strike entry ' + r.id + ' from the register? This removes it from the project.')) {
            LC.Model.remove(r.id);
            LC.Store.save();
            U.toast('Entry ' + r.id + ' struck from the register');
            location.hash = '#/register';
          }
        },
      }, 'Strike this entry from the register'),
      U.h('div', { class: 'note', style: { marginTop: '10px' } },
        'Striking an entry removes it outright. If the loss itself should stay on record, change its status instead.')));

    return desk;
  }

  return { build };
})();
