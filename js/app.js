/* app.js: interface wiring. The folio line, the menus, project open and
   save, the hash routes, and the small chores. Loaded last. */

LC.App = (function () {
  const S = LC.state;
  const U = LC.util;
  let filePickCb = null;

  /* ---------- routing: #/register, #/entry/<id>, #/timeline, #/statistics, #/atlas ---------- */
  function parseHash() {
    const h = location.hash || '';
    const m = /^#\/entry\/(.+)$/.exec(h);
    if (m) return { view: 'entry', id: decodeURIComponent(m[1]) };
    if (h === '#/timeline') return { view: 'timeline', id: null };
    if (h === '#/statistics') return { view: 'statistics', id: null };
    if (h === '#/atlas') return { view: 'atlas', id: null };
    if (h === '#/index') return { view: 'index', id: null };
    return { view: 'register', id: null };
  }

  function route() {
    const r = parseHash();
    if (r.view === 'entry' && !r.id && S.route.id) r.id = S.route.id;
    if (r.view === 'entry' && r.id) S.route.id = r.id;
    S.route.view = r.view;

    ['register', 'entry', 'timeline', 'statistics', 'atlas', 'index'].forEach(v => {
      const sect = document.getElementById('view-' + v);
      if (sect) sect.classList.toggle('hidden', v !== r.view);
      const btn = document.querySelector('nav.folio button[data-view="' + v + '"]');
      if (btn) btn.classList.toggle('on', v === r.view);
    });

    if (r.view === 'register') LC.Register.render();
    else if (r.view === 'entry') LC.Record.render(r.id);
    else if (r.view === 'timeline') LC.Timeline.render();
    else if (r.view === 'statistics') LC.Stats.render();
    else if (r.view === 'atlas') LC.Atlas.render();
    else if (r.view === 'index') LC.Indexes.render();
    window.scrollTo(0, 0);
  }

  /* ---------- a paper dialog over the page ---------- */
  function sheet(title, body, actions) {
    const overlay = U.h('div', { class: 'sheet-overlay' });
    const close = () => overlay.remove();
    const dlg = U.h('div', { class: 'paper-dialog' },
      U.h('h3', null, title),
      U.h('div', { class: 'dlg-body' }, body));
    const acts = U.h('div', { class: 'dlg-actions' });
    (actions || [{ label: 'Close' }]).forEach(a => {
      acts.append(U.h('button', { class: 'btn' + (a.danger ? ' danger' : '') }, a.label));
      const b = acts.lastElementChild;
      b.addEventListener('click', () => { if (!a.onclick || a.onclick() !== false) close(); });
    });
    dlg.append(acts);
    overlay.append(dlg);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.append(overlay);
    return close;
  }

  /* ---------- change notifications ---------- */
  function entryChanged(r, structural) {
    LC.Model.touch(r);
    LC.Store.save();
    if (S.route.view === 'entry') LC.Record.refreshTombstone(r, !!structural);
  }

  function projectChanged() {
    S.project.modified = U.nowISO();
    LC.Store.save();
    /* update the displayed front matter in place, keeping focus in the form */
    const t = document.querySelector('.fm-title');
    if (t) t.textContent = S.project.title || 'Untitled register';
    const kept = [S.project.compiler, S.project.institution].filter(Boolean).join(', ');
    const line = document.querySelector('.frontmatter > .fm-line');
    if (line) line.textContent = 'A register of absent works' + (kept ? ' · kept by ' + kept : '');
  }

  /* ---------- project I/O ---------- */
  function newProject() {
    if (!confirm('Start a new, empty register? If the current one matters, save its project file first.')) return;
    LC.Model.reset();
    LC.Store.save();
    S.route.id = null;
    location.hash = '#/register';
    route();
    U.toast('A new register is open');
  }

  function openProject(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        LC.Model.loadData(JSON.parse(reader.result));
        LC.Store.save();
        S.route.id = null;
        location.hash = '#/register';
        route();
        U.toast('Project opened');
      } catch (e) {
        U.toast(e.message || 'That file could not be read as a Lacuna project');
      }
    };
    reader.readAsText(file);
  }

  function loadSample() {
    if (!window.LC.SAMPLE) return U.toast('No sample is bundled with this copy');
    if (S.records.length && !confirm('Replace the current register with the sample? Save your project file first if it matters.')) return;
    LC.Model.loadData(JSON.parse(JSON.stringify(LC.SAMPLE)));
    LC.Store.save();
    S.route.id = null;
    location.hash = '#/register';
    route();
    U.toast('The sample register is open');
  }

  function newEntry() {
    const r = LC.Model.add();
    LC.Store.save();
    location.hash = '#/entry/' + r.id;
    /* focus the first title field once the page is drawn */
    setTimeout(() => {
      const first = document.querySelector('.desk input');
      if (first) first.focus();
    }, 60);
  }

  /* ---------- bringing work in ---------- */

  /* possible duplicates, quietly raised after an import or merge */
  function offerDuplicates(newIds) {
    const pairs = LC.Importers.findDuplicates(newIds);
    if (!pairs.length) return;
    const body = U.h('div');
    body.append(U.h('p', { class: 'hint', style: { marginTop: '12px' } },
      (pairs.length === 1 ? 'One new entry shares' : pairs.length + ' new entries share') +
      ' a title and creator with an entry already in the register. Relate them, strike the new one as a duplicate, or keep both.'));
    pairs.forEach(pr => {
      const row = U.h('div', { class: 'conflict' },
        U.h('div', { class: 'cid' }, pr.fresh.id + ' · possible duplicate of ' + pr.existing.id),
        U.h('div', { class: 'sum', style: { fontSize: '15px', color: 'var(--ink-2)', marginBottom: '10px' } },
          LC.Model.title(pr.fresh) + (pr.fresh.creator ? ' · ' + pr.fresh.creator : '')));
      const acts = U.h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } });
      const done = note => {
        acts.innerHTML = '';
        acts.append(U.h('span', { class: 'hint', style: { fontStyle: 'italic' } }, note));
        LC.Store.save();
      };
      acts.append(
        U.h('button', {
          class: 'btn', onclick: () => {
            pr.fresh.relations.push({ type: 'related', target: pr.existing.id });
            LC.Model.touch(pr.fresh);
            done('related to ' + pr.existing.id);
          },
        }, 'Relate them'),
        U.h('button', {
          class: 'btn danger', onclick: () => {
            pr.fresh.struck = true;
            LC.Model.touch(pr.fresh);
            done(pr.fresh.id + ' struck as a duplicate');
          },
        }, 'Strike the new one'),
        U.h('button', { class: 'btn quiet', onclick: () => done('kept both') }, 'Keep both'));
      row.append(acts);
      body.append(row);
    });
    sheet('Possible duplicates', body, [{ label: 'Done', onclick: () => { route(); } }]);
  }

  function importCSVFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = LC.Importers.importCSV(reader.result);
        LC.Store.save();
        route();
        let msg = res.added + (res.added === 1 ? ' entry' : ' entries') + ' imported, held back until you publish them';
        if (res.renumbered) msg += '; ' + res.renumbered + ' renumbered';
        U.toast(msg);
        if (res.unmatched.length) setTimeout(() =>
          U.toast('Columns not understood: ' + res.unmatched.slice(0, 4).join(', ') + (res.unmatched.length > 4 ? '…' : '')), 2600);
        offerDuplicates(res.ids);
      } catch (e) {
        U.toast(e.message || 'That file could not be read as a CSV');
      }
    };
    reader.readAsText(file);
  }

  function mergeFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let plan;
      try { plan = LC.Importers.planMerge(JSON.parse(reader.result)); }
      catch (e) { return U.toast(e.message || 'That file could not be read as a Lacuna project'); }

      const summary = () => {
        LC.Importers.applyMerge(plan, choices);
        LC.Store.save();
        route();
        U.toast('Merged: ' + plan.newRecords.length + ' new, ' +
          plan.conflicts.length + ' reconciled, ' + plan.identical + ' identical' +
          (plan.newEvents.length ? ', ' + plan.newEvents.length + ' events' : ''));
        if (plan.newRecords.length) setTimeout(() => offerDuplicates(plan.newRecords.map(r => r.id)), 400);
      };
      const choices = {};
      if (!plan.conflicts.length) {
        if (!plan.newRecords.length && !plan.newEvents.length) return U.toast('Nothing new: the registers already agree');
        return summary();
      }

      /* conflicts decided by a human, side by side */
      const body = U.h('div');
      body.append(U.h('p', { class: 'hint', style: { marginTop: '12px' } },
        plan.newRecords.length + ' new entries will be added. These ' + plan.conflicts.length +
        ' exist in both registers and differ; choose which version stands. The newer one is suggested.'));
      plan.conflicts.forEach(c => {
        const newer = (c.incoming.modified || '') > (c.local.modified || '') ? 'theirs' : 'mine';
        choices[c.id] = newer;
        const side = (who, label, rec) => {
          const radio = U.h('input', { type: 'radio', name: 'cf-' + c.id, value: who });
          radio.checked = choices[c.id] === who;
          radio.addEventListener('change', () => { choices[c.id] = who; });
          return U.h('div', { class: 'side' },
            U.h('label', null, radio,
              U.h('span', null,
                U.h('span', { class: 'who' }, label + (newer === who ? ' · newer' : '')),
                U.h('div', { class: 'sum' },
                  LC.Model.title(rec) + ' · ' + LC.vocab.statusOf(rec.status).label.toLowerCase() +
                  (rec.modified ? ' · ' + rec.modified.slice(0, 10) : '')))));
        };
        body.append(U.h('div', { class: 'conflict' },
          U.h('div', { class: 'cid' }, c.id),
          U.h('div', { class: 'sides' }, side('mine', 'Mine', c.local), side('theirs', 'Theirs', c.incoming))));
      });
      sheet('Reconcile the two registers', body, [
        { label: 'Cancel', onclick: () => true },
        { label: 'Apply merge', onclick: () => { summary(); } },
      ]);
    };
    reader.readAsText(file);
  }

  async function checkFixity(files) {
    U.toast('Hashing ' + files.length + (files.length === 1 ? ' file…' : ' files…'));
    const results = await LC.Importers.checkFiles(files);
    if (results.length && results.every(x => x.verdict === 'verified')) {
      return U.toast('All ' + results.length + ' verified: the files match their fingerprints');
    }
    const body = U.h('div');
    const table = U.h('table', { class: 'report-table' });
    results.forEach(x => {
      table.append(U.h('tr', null,
        U.h('td', { class: 'f' }, x.name),
        U.h('td', null, x.entry || ''),
        U.h('td', { class: x.verdict === 'verified' ? 'ok' : x.verdict === 'mismatch' ? 'bad' : '' },
          x.verdict === 'verified' ? 'unchanged' : x.verdict === 'mismatch' ? 'DOES NOT MATCH' : 'not in the register')));
    });
    body.append(table);
    sheet('Fixity report', body, [{ label: 'Close' }]);
  }

  /* a shared file dialog: callers hand over what to do with the file */
  function pickFile(cb) {
    filePickCb = cb;
    const input = document.getElementById('file-input');
    input.value = '';
    input.click();
  }

  /* ---------- the live file on disk ---------- */
  function updateDiskItem() {
    const item = document.getElementById('disk-item');
    if (!item) return;
    const st = LC.Disk.state();
    if (st.mode === 'unsupported') { item.style.display = 'none'; return; }
    item.style.display = '';
    if (st.mode === 'active') {
      item.innerHTML = 'Stop saving to disk<small>now saving to ' + U.esc(st.name) + ' as you work</small>';
    } else if (st.mode === 'pending') {
      item.innerHTML = 'Resume saving to disk<small>pick up ' + U.esc(st.name) + ' from last time</small>';
    } else {
      item.innerHTML = 'Keep the file on disk<small>save continuously to a .json you choose, alongside the browser autosave</small>';
    }
  }

  async function diskAction() {
    const st = LC.Disk.state();
    try {
      if (st.mode === 'active') await LC.Disk.disconnect();
      else if (st.mode === 'pending') await LC.Disk.resume();
      else await LC.Disk.connect();
    } catch (e) {
      if (e && e.name !== 'AbortError') U.toast('Could not open the file: ' + (e.message || e));
    }
    updateDiskItem();
  }

  /* ---------- menus ---------- */
  function closeMenus() {
    document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
  }
  function wireMenu(btnId, menuId) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const wasHidden = menu.classList.contains('hidden');
      closeMenus();
      if (wasHidden) menu.classList.remove('hidden');
    });
    menu.addEventListener('click', e => e.stopPropagation());
  }

  /* ---------- boot ---------- */
  function boot() {
    if (!LC.Store.load()) {
      if (window.LC.SAMPLE) {
        try { LC.Model.loadData(JSON.parse(JSON.stringify(LC.SAMPLE))); } catch (e) { LC.Model.reset(); }
      } else {
        LC.Model.reset();
      }
    }

    document.querySelectorAll('nav.folio button[data-view]').forEach(b => {
      b.addEventListener('click', () => {
        const v = b.dataset.view;
        location.hash = v === 'entry' ? (S.route.id ? '#/entry/' + S.route.id : '#/entry/') : '#/' + v;
      });
    });

    document.getElementById('new-entry-btn').addEventListener('click', newEntry);
    wireMenu('project-btn', 'project-menu');
    wireMenu('export-btn', 'export-menu');
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });

    document.getElementById('project-menu').addEventListener('click', e => {
      const act = e.target.closest('button') && e.target.closest('button').dataset.act;
      if (!act) return;
      closeMenus();
      if (act === 'new') newProject();
      else if (act === 'open') { const i = document.getElementById('project-input'); i.value = ''; i.click(); }
      else if (act === 'save') LC.Exporters.saveProject();
      else if (act === 'disk') diskAction();
      else if (act === 'csv') { const i = document.getElementById('csv-input'); i.value = ''; i.click(); }
      else if (act === 'merge') { const i = document.getElementById('merge-input'); i.value = ''; i.click(); }
      else if (act === 'fixity') { const i = document.getElementById('fixity-input'); i.value = ''; i.click(); }
      else if (act === 'sample') loadSample();
    });
    document.getElementById('export-menu').addEventListener('click', e => {
      const act = e.target.closest('button') && e.target.closest('button').dataset.act;
      if (!act) return;
      closeMenus();
      if (act === 'csv') LC.Exporters.registerCSV();
      else if (act === 'json') LC.Exporters.publicJSON();
      else if (act === 'aid') LC.Exporters.findingAid();
      else if (act === 'book') LC.Exporters.printBook();
      else if (act === 'print') window.print();
    });

    document.getElementById('project-input').addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) openProject(e.target.files[0]);
    });
    document.getElementById('file-input').addEventListener('change', e => {
      if (e.target.files && e.target.files[0] && filePickCb) filePickCb(e.target.files[0]);
      filePickCb = null;
    });
    document.getElementById('csv-input').addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) importCSVFile(e.target.files[0]);
    });
    document.getElementById('merge-input').addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) mergeFile(e.target.files[0]);
    });
    document.getElementById('fixity-input').addEventListener('change', e => {
      if (e.target.files && e.target.files.length) checkFixity(Array.from(e.target.files));
    });

    window.addEventListener('hashchange', route);
    route();

    /* a gentle word when an embargo date has passed */
    const lapsed = LC.Model.lapsedEmbargoes();
    if (lapsed.length) {
      const ids = [...new Set(lapsed.map(x => x.recordId))];
      setTimeout(() => U.toast(
        (lapsed.length === 1 ? 'An embargo date has passed' : lapsed.length + ' embargo dates have passed') +
        ': review ' + ids.slice(0, 3).join(', ') + (ids.length > 3 ? '…' : '')), 900);
    }

    /* remember a live file from last session, if there was one */
    updateDiskItem();
    LC.Disk.init().then(updateDiskItem).catch(() => {});

    /* offline: a service worker caches the tool after the first visit */
    if ('serviceWorker' in navigator &&
        (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { route, entryChanged, projectChanged, newEntry, newProject, loadSample, pickFile, sheet };
})();
