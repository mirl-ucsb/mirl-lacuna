/* register.js: the register itself, a ruled table of the whole archive,
   with the front matter above it and a filter line for working registers.
   The table renderer is a pure function over data so the static finding aid
   can reuse it unchanged. */

LC.Register = (function () {
  const S = LC.state;
  const U = LC.util;

  /* ---------- pure renderers (shared with the export) ---------- */

  function certHTML(r) {
    const c = LC.vocab.certaintyOf(r.certainty);
    return '<span class="cert"><span class="pt">' + c.pt + '</span>' + c.label + '</span>';
  }

  function lastSeenText(r) {
    return [r.lastSeen.date, r.lastSeen.place].filter(s => s && s.trim()).join(' · ');
  }

  function rowHTML(r, opts) {
    const st = LC.vocab.statusOf(r.status);
    const t = LC.Model.title(r);
    const alts = LC.Model.altTitles(r);
    const dirAttr = s => U.isRTL(s) ? ' dir="rtl"' : '';
    let titleCell = '<span class="t"' + dirAttr(t) + '>' + U.esc(t) + '</span>';
    alts.forEach(a => { titleCell += '<span class="t2"' + dirAttr(a.text) + (a.lang ? ' lang="' + U.esc(a.lang) + '"' : '') + '>' + U.esc(a.text) + '</span>'; });
    if (r.creator) titleCell += '<span class="by">' + U.esc(r.creator) + '</span>';
    const flag = r.struck ? '<span class="struck-flag">struck</span>'
      : (!r.publish && !opts.static ? '<span class="held-flag">held back</span>' : '');
    return '<tr class="entry' + (r.struck ? ' struck' : '') + '" data-id="' + U.esc(r.id) + '">' +
      '<td class="no">' + U.esc(r.id) + flag + '</td>' +
      '<td class="title">' + titleCell + '</td>' +
      '<td class="mono">' + U.esc(r.date) + '</td>' +
      '<td>' + U.esc(r.medium) + '</td>' +
      '<td>' + U.esc(r.origin) + '</td>' +
      '<td><span class="mark ' + st.cls + '">' + U.esc(st.label) + '</span></td>' +
      '<td>' + certHTML(r) + '</td>' +
      '<td>' + U.esc(lastSeenText(r)) + '</td>' +
      '</tr>';
  }

  function tableHTML(records, opts) {
    opts = opts || {};
    const sortable = !opts.static;
    const cols = [
      ['no', 'No.'], ['title', 'Entry'], ['date', 'Date'], [null, 'Medium'],
      [null, 'Originating collection'], ['status', 'Status'], [null, 'Certainty'], [null, 'Last seen'],
    ];
    let h = '<table class="register"><thead><tr>';
    cols.forEach(([key, label]) => {
      const isSorted = sortable && key && S.sort.by === key;
      h += '<th' + (sortable && key ? ' data-sort="' + key + '"' : ' style="cursor:default"') + '>' +
        U.esc(label) + (isSorted ? '<span class="dir">' + (S.sort.dir > 0 ? '▾' : '▴') + '</span>' : '') + '</th>';
    });
    h += '</tr></thead><tbody>';
    if (!records.length) {
      h += '<tr><td colspan="8" class="register-empty" id="register-empty-cell"></td></tr>';
    } else {
      records.forEach(r => { h += rowHTML(r, opts); });
    }
    h += '</tbody></table>';
    return h;
  }

  /* ---------- filtering and sorting ---------- */

  function matches(r, q) {
    if (!q) return true;
    const hay = [
      r.id, r.creator, r.date, r.medium, r.origin, r.note,
      (r.titles || []).map(t => t.text).join(' '),
      (r.tags || []).join(' '),
      r.lastSeen.place, r.lastSeen.source, (r.location || {}).place,
    ].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
  }

  function visible() {
    let rs = S.records.filter(r => matches(r, S.filters.q));
    if (S.filters.statuses.length) rs = rs.filter(r => S.filters.statuses.includes(r.status));
    const dir = S.sort.dir, by = S.sort.by;
    const key = r => by === 'title' ? LC.Model.title(r).toLowerCase()
      : by === 'date' ? (r.date || '\uffff')
      : by === 'status' ? LC.vocab.STATUS.findIndex(s => s.key === r.status)
      : r.id;
    rs = rs.slice().sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * dir);
    return rs;
  }

  /* ---------- the working view ---------- */

  function fmField(key, label, ph) {
    const input = U.h('input', { type: 'text', value: S.project[key] || '', placeholder: ph || '' });
    input.addEventListener('input', () => { S.project[key] = input.value; LC.App.projectChanged(); });
    return U.h('div', { class: 'field' }, U.h('label', null, label), input);
  }

  function frontmatter() {
    const p = S.project;
    const kept = [p.compiler, p.institution].filter(Boolean).join(', ');
    const fm = U.h('div', { class: 'frontmatter' },
      U.h('h2', { class: 'fm-title' }, p.title || 'Untitled register'),
      p.subtitle ? U.h('p', { class: 'fm-sub' }, p.subtitle) : null,
      U.h('div', { class: 'fm-line' }, 'A register of absent works' + (kept ? ' · kept by ' + kept : '')),
      p.note ? U.h('p', { class: 'hint', style: { maxWidth: '760px', marginTop: '14px' } }, p.note) : null);
    const det = U.h('details', null, U.h('summary', null, 'Front matter'));
    const form = U.h('div', { class: 'fm-form' });
    form.append(
      fmField('title', 'Title of the register', 'e.g. Register of the lost studio archive'),
      fmField('subtitle', 'Subtitle', 'optional'),
      U.h('div', { class: 'row2' },
        fmField('compiler', 'Compiled by', 'your name'),
        fmField('institution', 'Institution or community', 'optional')),
      fmField('contact', 'Contact', 'optional; appears in the finding aid'));
    const noteArea = U.h('textarea', { rows: '3', placeholder: 'A short note on the scope of this register: what it covers, on whose behalf, with what sources.' });
    noteArea.value = p.note || '';
    noteArea.addEventListener('input', () => { p.note = noteArea.value; LC.App.projectChanged(); });
    form.append(U.h('div', { class: 'field' }, U.h('label', null, 'Scope note'), noteArea));
    det.append(form);
    fm.append(det);
    return fm;
  }

  function filterline() {
    const wrap = U.h('div', { class: 'filterline' });
    const q = U.h('input', { type: 'text', value: S.filters.q, placeholder: 'Search the register…' });
    q.addEventListener('input', () => { S.filters.q = q.value; renderTable(); });
    wrap.append(q);

    const marks = U.h('div', { class: 'marks' });
    LC.vocab.STATUS.forEach(st => {
      const n = S.records.filter(r => r.status === st.key && !r.struck).length;
      const b = U.h('button', {
        class: 'mark ' + st.cls + (S.filters.statuses.includes(st.key) ? ' on' : ''),
        title: 'Show only ' + st.label.toLowerCase() + ' entries',
        onclick: () => {
          const i = S.filters.statuses.indexOf(st.key);
          if (i >= 0) S.filters.statuses.splice(i, 1); else S.filters.statuses.push(st.key);
          render();
        },
      }, st.label + (n ? '  ' + n : ''));
      marks.append(b);
    });
    wrap.append(marks);

    if (S.filters.q || S.filters.statuses.length) {
      wrap.append(U.h('button', { class: 'act', onclick: () => { S.filters.q = ''; S.filters.statuses = []; render(); } }, 'Clear'));
    }
    return wrap;
  }

  function renderTable() {
    const host = document.getElementById('register-table');
    const rs = visible();
    host.innerHTML = tableHTML(rs, {});
    const count = document.getElementById('register-count');
    const live = S.records.filter(r => !r.struck).length;
    const shownLive = rs.filter(r => !r.struck).length;
    const shownStruck = rs.length - shownLive;
    let txt = shownLive === live
      ? live + (live === 1 ? ' entry' : ' entries')
      : shownLive + ' of ' + live + ' entries shown';
    const held = LC.Model.heldBackCount();
    if (held) txt += ' · ' + held + ' held back';
    if (shownStruck) txt += ' · ' + shownStruck + ' struck ' + (shownStruck === 1 ? 'line' : 'lines');
    count.textContent = txt;

    const emptyCell = document.getElementById('register-empty-cell');
    if (emptyCell) {
      if (!S.records.length) {
        emptyCell.append(
          'The register is empty. Every entry holds a place for something that is gone.',
          U.h('div', { class: 'actions' },
            U.h('button', { class: 'btn', onclick: () => LC.App.newEntry() }, 'Begin the first entry'),
            LC.SAMPLE ? U.h('button', { class: 'btn', onclick: () => LC.App.loadSample() }, 'Open the sample register') : null));
      } else {
        emptyCell.textContent = 'Nothing in the register matches. Clear the search or the status marks above.';
      }
    }

    host.querySelectorAll('tr.entry').forEach(tr => {
      tr.addEventListener('click', () => { location.hash = '#/entry/' + tr.dataset.id; });
    });
    host.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const by = th.dataset.sort;
        if (S.sort.by === by) S.sort.dir = -S.sort.dir; else { S.sort.by = by; S.sort.dir = 1; }
        renderTable();
      });
    });
  }

  function render() {
    const sect = document.getElementById('view-register');
    sect.innerHTML = '';
    const sheet = U.h('div', { class: 'sheet' });
    sheet.append(frontmatter(), filterline(),
      U.h('div', { class: 'countline', id: 'register-count' }),
      U.h('div', { id: 'register-table' }));
    sect.append(sheet);
    renderTable();
  }

  return { render, tableHTML, visible };
})();
