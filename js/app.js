/* app.js: interface wiring. The folio line, the menus, project open and
   save, the hash routes, and the small chores. Loaded last. */

LC.App = (function () {
  const S = LC.state;
  const U = LC.util;
  let filePickCb = null;

  /* ---------- routing: #/register, #/entry/<id>, #/statistics, #/atlas ---------- */
  function parseHash() {
    const h = location.hash || '';
    const m = /^#\/entry\/(.+)$/.exec(h);
    if (m) return { view: 'entry', id: decodeURIComponent(m[1]) };
    if (h === '#/statistics') return { view: 'statistics', id: null };
    if (h === '#/atlas') return { view: 'atlas', id: null };
    return { view: 'register', id: null };
  }

  function route() {
    const r = parseHash();
    if (r.view === 'entry' && !r.id && S.route.id) r.id = S.route.id;
    if (r.view === 'entry' && r.id) S.route.id = r.id;
    S.route.view = r.view;

    ['register', 'entry', 'statistics', 'atlas'].forEach(v => {
      const sect = document.getElementById('view-' + v);
      if (sect) sect.classList.toggle('hidden', v !== r.view);
      const btn = document.querySelector('nav.folio button[data-view="' + v + '"]');
      if (btn) btn.classList.toggle('on', v === r.view);
    });

    if (r.view === 'register') LC.Register.render();
    else if (r.view === 'entry') LC.Record.render(r.id);
    else if (r.view === 'statistics') LC.Stats.render();
    else if (r.view === 'atlas') LC.Atlas.render();
    window.scrollTo(0, 0);
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

  /* a shared file dialog: callers hand over what to do with the file */
  function pickFile(cb) {
    filePickCb = cb;
    const input = document.getElementById('file-input');
    input.value = '';
    input.click();
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
      else if (act === 'sample') loadSample();
    });
    document.getElementById('export-menu').addEventListener('click', e => {
      const act = e.target.closest('button') && e.target.closest('button').dataset.act;
      if (!act) return;
      closeMenus();
      if (act === 'csv') LC.Exporters.registerCSV();
      else if (act === 'json') LC.Exporters.publicJSON();
      else if (act === 'aid') LC.Exporters.findingAid();
      else if (act === 'print') window.print();
    });

    document.getElementById('project-input').addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) openProject(e.target.files[0]);
    });
    document.getElementById('file-input').addEventListener('change', e => {
      if (e.target.files && e.target.files[0] && filePickCb) filePickCb(e.target.files[0]);
      filePickCb = null;
    });

    window.addEventListener('hashchange', route);
    route();
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { route, entryChanged, projectChanged, newEntry, newProject, loadSample, pickFile };
})();
