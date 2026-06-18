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
      if (btn) {
        btn.classList.toggle('on', v === r.view);
        if (v === r.view) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
      }
    });

    if (r.view === 'register') LC.Register.render();
    else if (r.view === 'entry') LC.Record.render(r.id);
    else if (r.view === 'timeline') LC.Timeline.render();
    else if (r.view === 'statistics') LC.Stats.render();
    else if (r.view === 'atlas') LC.Atlas.render();
    else if (r.view === 'index') LC.Indexes.render();
    U.associateLabels(document.getElementById('main'));
    window.scrollTo(0, 0);
  }

  /* ---------- a paper dialog over the page ---------- */
  /* make an overlay behave as a modal: label it, trap Tab inside it, close on
     Escape, and restore focus to whatever was focused before it opened */
  function modalize(overlay, dlg, closeFn, initialFocus) {
    const prev = document.activeElement;
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    const h3 = dlg.querySelector('h3');
    if (h3) { if (!h3.id) h3.id = 'dlg-' + U.uid(); dlg.setAttribute('aria-labelledby', h3.id); }
    const SEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(dlg.querySelectorAll(SEL)).filter(e => e.offsetParent !== null);
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeFn(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    setTimeout(() => { (initialFocus || focusables()[0] || dlg).focus(); }, 40);
    return () => { try { if (prev && prev.focus) prev.focus(); } catch (e) {} };
  }

  function sheet(title, body, actions) {
    const overlay = U.h('div', { class: 'sheet-overlay' });
    let restore = () => {};
    const close = () => { overlay.remove(); restore(); };
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
    U.associateLabels(dlg);
    restore = modalize(overlay, dlg, close);
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

  /* ---------- the lock ---------- */
  function updateLockItem() {
    const item = document.getElementById('lock-item');
    if (!item) return;
    if (!(window.crypto && crypto.subtle)) { item.style.display = 'none'; return; }
    item.innerHTML = LC.Lock.active()
      ? 'Change or remove the lock<small>the autosave, the disk file, and saved projects are encrypted</small>'
      : 'Lock this register<small>a passphrase encrypts the file at rest; exports stay plain</small>';
  }

  function passField(label, ph) {
    const input = U.h('input', { type: 'password', placeholder: ph || '', autocomplete: 'new-password' });
    return { input, field: U.h('div', { class: 'field' }, U.h('label', null, label), input) };
  }

  function lockDialog() {
    if (!(window.crypto && crypto.subtle)) return U.toast('This browser cannot encrypt here');
    const body = U.h('div');
    const err = U.h('div', { class: 'note', style: { color: 'var(--stamp)', minHeight: '18px' } });
    if (!LC.Lock.active()) {
      const p1 = passField('Passphrase'), p2 = passField('The same again');
      body.append(
        U.h('p', { class: 'hint', style: { marginTop: '12px' } },
          'The passphrase encrypts the browser autosave, the live disk file, and saved project files. It protects the file at rest: while the register is open here, it is open. There is no recovery if the passphrase is lost. Exports (the finding aid, the spreadsheet, public data) are publications and stay plain.'),
        p1.field, p2.field, err);
      sheet('Lock this register', body, [
        { label: 'Cancel', onclick: () => true },
        {
          label: 'Lock it', onclick: () => {
            const a = p1.input.value, b = p2.input.value;
            if (a.length < 8) { err.textContent = 'Use at least eight characters.'; return false; }
            if (a !== b) { err.textContent = 'The two do not match.'; return false; }
            LC.Lock.set(a).then(() => {
              LC.Store.save();
              updateLockItem();
              U.toast('Locked: the file at rest is now encrypted');
            });
          },
        },
      ]);
      setTimeout(() => p1.input.focus(), 60);
    } else {
      const p1 = passField('New passphrase', 'leave empty to keep the current one');
      const p2 = passField('The same again');
      body.append(
        U.h('p', { class: 'hint', style: { marginTop: '12px' } },
          'Set a new passphrase, or remove the lock and return the file at rest to plain JSON.'),
        p1.field, p2.field, err);
      sheet('Change or remove the lock', body, [
        { label: 'Cancel', onclick: () => true },
        {
          label: 'Remove the lock', danger: true, onclick: () => {
            if (!confirm('Remove the lock? The autosave and future saves return to plain, readable JSON.')) return false;
            LC.Lock.remove();
            LC.Store.save();
            updateLockItem();
            U.toast('Unlocked: the file at rest is plain again');
          },
        },
        {
          label: 'Set new passphrase', onclick: () => {
            const a = p1.input.value, b = p2.input.value;
            if (a.length < 8) { err.textContent = 'Use at least eight characters.'; return false; }
            if (a !== b) { err.textContent = 'The two do not match.'; return false; }
            LC.Lock.set(a).then(() => {
              LC.Store.save();
              U.toast('The passphrase is changed');
            });
          },
        },
      ]);
    }
  }

  /* a modal that will not be clicked away: the register is locked */
  function unlockOverlay(envelope, onOpen, cancellable) {
    const overlay = U.h('div', { class: 'sheet-overlay' });
    const err = U.h('div', { class: 'note', style: { color: 'var(--stamp)', minHeight: '18px' } });
    const pass = U.h('input', { type: 'password', placeholder: 'passphrase', autocomplete: 'current-password', style: { width: '100%' } });
    const tryOpen = () => {
      err.textContent = '';
      LC.Lock.unseal(envelope, pass.value).then(raw => {
        overlay.remove();
        onOpen(raw);
      }).catch(() => {
        err.textContent = 'That passphrase does not open it.';
        pass.select();
      });
    };
    pass.addEventListener('keydown', e => { if (e.key === 'Enter') tryOpen(); });
    const acts = U.h('div', { class: 'dlg-actions' });
    if (cancellable) {
      acts.append(U.h('button', { class: 'btn quiet', onclick: () => overlay.remove() }, 'Cancel'));
    } else {
      acts.append(U.h('button', {
        class: 'btn quiet', onclick: () => {
          if (confirm('Set the locked register aside and start empty? Nothing is deleted: it stays locked in this browser and in any file you saved, and unlocking later brings it back.')) {
            overlay.remove();
            LC.Model.reset();
            route();
          }
        },
      }, 'Start empty instead'));
    }
    acts.append(U.h('button', { class: 'btn', onclick: tryOpen }, 'Unlock'));
    pass.setAttribute('aria-label', 'Passphrase');
    const dlg = U.h('div', { class: 'paper-dialog', style: { maxWidth: '460px' } },
      U.h('h3', null, 'This register is locked'),
      U.h('div', { class: 'dlg-body' },
        U.h('p', { class: 'hint', style: { margin: '12px 0 16px' } }, 'Its passphrase opens it; nothing shows until then.'),
        U.h('div', { class: 'field' }, pass), err));
    overlay.append(dlg);
    document.body.append(overlay);
    modalize(overlay, dlg, () => { if (cancellable) overlay.remove(); }, pass);
  }

  /* ---------- project I/O ---------- */
  function newProject() {
    if (!confirm('Start a new, empty register? If the current one matters, save its project file first.')) return;
    LC.Lock.remove();
    LC.Model.reset();
    LC.Store.save();
    updateLockItem();
    S.route.id = null;
    location.hash = '#/register';
    route();
    U.toast('A new register is open');
  }

  function openProject(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (e) { return U.toast('That file could not be read as a Lacuna project'); }
      const finish = raw => {
        try {
          LC.Model.loadData(typeof raw === 'string' ? JSON.parse(raw) : raw);
          LC.Store.save();
          updateLockItem();
          S.route.id = null;
          location.hash = '#/register';
          route();
          U.toast('Project opened' + (LC.Lock.active() ? ' (locked; this session keeps its passphrase)' : ''));
        } catch (e) {
          U.toast(e.message || 'That file could not be read as a Lacuna project');
        }
      };
      if (LC.Lock.isEnvelope(data)) unlockOverlay(data, finish, true);
      else finish(data);
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
          (plan.newEvents.length ? ', ' + plan.newEvents.length + ' events' : '') +
          (plan.newSources.length ? ', ' + plan.newSources.length + ' sources' : ''));
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
        const bothRadio = U.h('input', { type: 'radio', name: 'cf-' + c.id, value: 'both' });
        bothRadio.addEventListener('change', () => { choices[c.id] = 'both'; });
        body.append(U.h('div', { class: 'conflict' },
          U.h('div', { class: 'cid' }, c.id),
          U.h('div', { class: 'sides' }, side('mine', 'Mine', c.local), side('theirs', 'Theirs', c.incoming)),
          U.h('label', { style: { display: 'flex', gap: '10px', alignItems: 'baseline', marginTop: '10px', cursor: 'pointer', fontSize: '15px', color: 'var(--ink-2)' } },
            bothRadio,
            U.h('span', null, 'Keep both: these are different works; theirs joins under a fresh number'))));
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

  /* ---------- the people who remember ----------
     The manager for narrators and sources: aliases publish, identities do
     not, and the view that matters when consent shifts: everything that
     rests on this person's word, restrictable at once. */
  function sourcesDialog() {
    const body = U.h('div');

    const srcField = (s, key, label, ph, note) => {
      const input = U.h('input', { type: 'text', value: s[key] || '', placeholder: ph || '', dir: 'auto' });
      input.addEventListener('input', () => {
        s[key] = input.value;
        S.project.modified = U.nowISO();
        LC.Store.save();
      });
      const f = U.h('div', { class: 'field' }, U.h('label', null, label), input);
      if (note) f.append(U.h('div', { class: 'note' }, note));
      return f;
    };

    const redraw = () => {
      body.innerHTML = '';
      body.append(U.h('p', { class: 'hint', style: { marginTop: '12px' } },
        'The people the register rests on. Only the alias is ever published or exported; the identity, contact, and consent notes stay in the working file. Link evidence and sightings to a source from the cataloguer’s desk.'));
      if (!(S.project.sources || []).length) {
        body.append(U.h('p', { class: 'hint', style: { fontStyle: 'italic' } }, 'No sources are recorded yet.'));
      }
      (S.project.sources || []).forEach(s => {
        const rests = LC.Model.restsOn(s.id);
        const item = U.h('div', { class: 'item' },
          U.h('div', { class: 'item-head' },
            U.h('span', { class: 'n' }, s.id),
            U.h('span', { class: 'sp' }),
            U.h('button', {
              class: 'act', onclick: () => {
                const cleared = LC.Model.removeSource(s.id);
                LC.Store.save();
                U.toast('Source removed' + (cleared ? '; unlinked from ' + cleared + (cleared === 1 ? ' item' : ' items') : ''));
                redraw();
              },
            }, 'Remove')),
          srcField(s, 'alias', 'Alias, as published', 'e.g. the studio’s apprentice',
            'The public handle; choose one that cannot identify them.'),
          U.h('div', { class: 'row2' },
            srcField(s, 'name', 'Identity', 'name; never published'),
            srcField(s, 'contact', 'Contact', 'never published')),
          srcField(s, 'consent', 'Consent', 'what they agreed to, and when',
            'In their words where possible: what may be used, what must wait, until when.'),
          srcField(s, 'note', 'Note', ''));

        const restsBox = U.h('div', { class: 'field' });
        restsBox.append(U.h('label', null, 'Rests on their word'));
        if (!rests.length) {
          restsBox.append(U.h('div', { class: 'note' }, 'Nothing yet.'));
        } else {
          rests.forEach(x => {
            restsBox.append(U.h('div', { style: { display: 'flex', gap: '12px', alignItems: 'baseline', padding: '4px 0' } },
              U.h('button', {
                class: 'act', style: { color: 'var(--stamp)' },
                onclick: () => { document.querySelector('.sheet-overlay').remove(); location.hash = '#/entry/' + x.record.id; },
              }, x.record.id),
              U.h('span', { style: { fontSize: '15px', color: 'var(--ink-2)' } },
                LC.Model.title(x.record) + ' · ' + x.kind +
                (x.kind === 'evidence' ? ' (' + x.item.consent + ')' : ''))));
          });
          const pub = rests.filter(x => x.kind === 'evidence' && x.item.consent === 'public').length;
          if (pub) {
            restsBox.append(U.h('div', { class: 'add-line' }, U.h('button', {
              class: 'btn danger', onclick: () => {
                if (!confirm('Mark all ' + pub + ' public evidence item' + (pub === 1 ? '' : 's') + ' from this source as restricted? Use this when their consent is withdrawn or in doubt.')) return;
                const n = LC.Model.restrictSource(s.id, 'restricted');
                LC.Store.save();
                U.toast(n + (n === 1 ? ' item' : ' items') + ' restricted; nothing of theirs will publish');
                redraw();
              },
            }, 'Restrict everything public of theirs')));
          }
        }
        item.append(restsBox);
        body.append(item);
      });
      body.append(U.h('div', { class: 'add-line' }, U.h('button', {
        class: 'act', onclick: () => { LC.Model.addSource(); LC.Store.save(); redraw(); },
      }, '+ Add a source')));
    };
    redraw();
    sheet('Sources and narrators', body, [{ label: 'Done', onclick: () => { route(); } }]);
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
    document.querySelectorAll('.menu-wrap [aria-haspopup]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  function wireMenu(btnId, menuId) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const willOpen = menu.classList.contains('hidden');
      closeMenus();
      if (willOpen) {
        menu.classList.remove('hidden');
        btn.setAttribute('aria-expanded', 'true');
        const first = menu.querySelector('button');
        if (first) setTimeout(() => first.focus(), 0);
      }
    });
    menu.addEventListener('click', e => e.stopPropagation());
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeMenus(); btn.focus(); }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    const loaded = LC.Store.load();
    if (loaded === false) {
      /* first visit opens to a blank register, not the sample; the empty
         state and the Project menu both offer to open the sample register */
      LC.Model.reset();
    } else if (loaded !== true) {
      /* a locked register waits in the autosave: ask before showing anything */
      setTimeout(() => unlockOverlay(loaded, raw => {
        try {
          LC.Model.loadData(JSON.parse(raw));
          updateLockItem();
          route();
          U.toast('Unlocked');
        } catch (e) { U.toast('The locked file could not be read'); }
      }, false), 50);
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
      else if (act === 'lock') lockDialog();
      else if (act === 'sources') sourcesDialog();
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
      else if (act === 'notice') {
        if (S.route.view !== 'entry' || !LC.Record.current) U.toast('Open an entry first; the notice prints one entry');
        else LC.Exporters.printNotice(LC.Record.current);
      }
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
    updateLockItem();
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
