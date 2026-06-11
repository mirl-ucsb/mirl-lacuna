/* atlas.js: places of last record, drawn as an atlas plate. Only locations
   the cataloguer has marked safe to publish are ever plotted, in the app as
   in every export; the rest are counted, not shown. Coastline: Natural Earth
   1:110m land (public domain), vendored as one SVG path in vendor/land.js.
   A pure renderer over data, so the static finding aid can reuse it. */

LC.Atlas = (function () {
  const U = LC.util;
  const W = 1000, H = 500;

  const px = lon => (lon + 180) / 360 * W;
  const py = lat => (90 - lat) / 180 * H;

  function plateSVG(points) {
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="World map of places of last record">';
    /* graticule each 30 degrees */
    for (let lon = -150; lon <= 150; lon += 30) s += '<line class="grat" x1="' + px(lon) + '" y1="0" x2="' + px(lon) + '" y2="' + H + '"/>';
    for (let lat = -60; lat <= 60; lat += 30) s += '<line class="grat" x1="0" y1="' + py(lat) + '" x2="' + W + '" y2="' + py(lat) + '"/>';
    s += '<path class="coast" d="' + (window.LC && LC.LAND ? LC.LAND : '') + '"/>';
    points.forEach(p => {
      const x = px(p.lon), y = py(p.lat);
      /* an approximate place draws as an open ring, without the core point */
      s += '<g class="site" data-id="' + U.esc(p.id) + '">' +
        '<circle class="pt" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (p.approx ? 5.5 : 4) + '"' +
        (p.approx ? ' stroke-dasharray="2.5 2"' : '') + '/>' +
        (p.approx ? '' : '<circle class="pt-core" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.2"/>') +
        '<text class="ptlab" x="' + (x + 7).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '">' + U.esc(p.id) + '</text></g>';
    });
    s += '<rect class="frame" x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '"/></svg>';
    return s;
  }

  function html(data, opts) {
    opts = opts || {};
    /* cancelled lines are never plotted; in the working view, held-back
       entries and withheld places count as withheld, so the plate always
       previews exactly what publication would show */
    const rs = (data.records || []).filter(r => !r.struck);
    const located = rs.filter(r => r.location && (r.location.place || (typeof r.location.lat === 'number' && typeof r.location.lon === 'number')));
    const showable = located.filter(r => (opts.publicOnly || r.publish) && r.location.publish !== 'withheld');
    const round1 = x => Math.round(x * 10) / 10;
    const points = showable.filter(r => typeof r.location.lat === 'number' && typeof r.location.lon === 'number')
      .map(r => ({
        id: r.id,
        approx: r.location.publish === 'approximate',
        lat: r.location.publish === 'approximate' ? round1(r.location.lat) : r.location.lat,
        lon: r.location.publish === 'approximate' ? round1(r.location.lon) : r.location.lon,
      }));
    const withheld = located.length - showable.length;

    let h = '<h2 class="head">Atlas</h2>' +
      '<p class="subhead">places of last record, published only with consent</p>';

    h += '<div class="atlas-plate"><div class="inner">' + plateSVG(points) +
      '<div class="atlas-caption">Places of last record · safe-to-publish locations only · equirectangular</div>' +
      '</div></div>';

    if (showable.length) {
      h += '<table class="gazetteer"><thead><tr><th>No.</th><th>Entry</th><th>Place</th><th>Coordinates</th><th>Status</th></tr></thead><tbody>';
      showable.forEach(r => {
        const st = LC.vocab.statusOf(r.status);
        const loc = r.location;
        const approx = loc.publish === 'approximate';
        const la = approx ? round1(loc.lat) : loc.lat, lo = approx ? round1(loc.lon) : loc.lon;
        const coords = (typeof loc.lat === 'number' && typeof loc.lon === 'number')
          ? Math.abs(la).toFixed(approx ? 1 : 3) + (la >= 0 ? ' N' : ' S') + ', ' +
            Math.abs(lo).toFixed(approx ? 1 : 3) + (lo >= 0 ? ' E' : ' W') + (approx ? ' · approx.' : '')
          : '';
        h += '<tr class="row" data-id="' + U.esc(r.id) + '">' +
          '<td class="no">' + U.esc(r.id) + '</td>' +
          '<td>' + U.esc(LC.Model.title(r)) + '</td>' +
          '<td>' + U.esc(loc.place || '') + '</td>' +
          '<td class="coords">' + coords + '</td>' +
          '<td><span class="mark ' + st.cls + '" style="font-size:11.5px;padding:4px 7px 3px">' + U.esc(st.label) + '</span></td></tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<p class="hint" style="margin-top:26px;font-style:italic">Nothing is plotted yet. A place appears here once an entry is marked for publication, has coordinates, and its place is set to publish exactly or approximately.</p>';
    }

    if (withheld > 0) {
      h += '<p class="stats-note">' + withheld + ' recorded ' + (withheld === 1 ? 'place is' : 'places are') +
        ' withheld' + (opts.publicOnly ? ' from this document' : ': the entry or its place is not yet marked for publication') + '.</p>';
    }
    return h;
  }

  function render() {
    const sect = document.getElementById('view-atlas');
    sect.innerHTML = '<div class="sheet">' + html({ project: LC.state.project, records: LC.state.records }, {}) + '</div>';
    sect.querySelectorAll('[data-id]').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => { location.hash = '#/entry/' + el.dataset.id; });
    });
  }

  return { html, render };
})();
