/* indexes.js: the back of the book. Alphabetical indexes of creators, tags,
   and places, each line pointing to entry numbers, with dotted leaders in
   the manner of a printed register. A pure renderer over data, so the
   static finding aid and the memorial book reuse it unchanged. */

LC.Indexes = (function () {
  const U = LC.util;

  /* gather index terms: term -> ordered unique entry ids */
  function gather(rs) {
    const creators = new Map(), tags = new Map(), places = new Map();
    const put = (map, term, id) => {
      term = String(term || '').trim();
      if (!term) return;
      if (!map.has(term)) map.set(term, []);
      const ids = map.get(term);
      if (!ids.includes(id)) ids.push(id);
    };
    rs.forEach(r => {
      put(creators, r.creator, r.id);
      (r.tags || []).forEach(t => put(tags, t, r.id));
      put(places, (r.location || {}).place, r.id);
      put(places, (r.lastSeen || {}).place, r.id);
    });
    return { creators, tags, places };
  }

  function sectionHTML(title, map) {
    const terms = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    let h = '<div class="ix-sect"><h3>' + U.esc(title) + '</h3>';
    if (!terms.length) {
      h += '<div class="ix-none">nothing indexed yet</div>';
    } else {
      terms.forEach(t => {
        const refs = map.get(t).map(id =>
          '<a class="ix-ref" href="#/entry/' + U.esc(id) + '" data-id="' + U.esc(id) + '">' + U.esc(id.replace(/^[A-Z]+-0*/, '')) + '</a>').join(', ');
        h += '<div class="ix-line"><span class="ix-term"' + (U.isRTL(t) ? ' dir="rtl"' : '') + '>' + U.esc(t) + '</span>' +
          '<span class="dots"></span><span class="ix-refs">' + refs + '</span></div>';
      });
    }
    return h + '</div>';
  }

  function html(data, opts) {
    opts = opts || {};
    const rs = (data.records || []).filter(r => !r.struck);
    const ix = gather(rs);
    let h = '<h2 class="head">Index</h2>' +
      '<p class="subhead">creators, tags, and places, each pointing to its entry numbers</p>';
    h += sectionHTML('Creators and makers', ix.creators);
    h += sectionHTML('Tags', ix.tags);
    h += sectionHTML('Places', ix.places);
    h += '<p class="stats-note">Numbers refer to entries of this register (LAC-).</p>';
    return h;
  }

  function render() {
    const sect = document.getElementById('view-index');
    sect.innerHTML = '<div class="sheet narrow">' +
      html({ project: LC.state.project, records: LC.state.records }, {}) + '</div>';
    sect.querySelectorAll('.ix-ref[data-id]').forEach(el => {
      el.addEventListener('click', () => { location.hash = '#/entry/' + el.dataset.id; });
    });
  }

  return { html, render };
})();
