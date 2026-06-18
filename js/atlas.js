/* atlas.js: places of last record, drawn as an atlas plate. In the working
   register the cataloguer sees every located entry, so a place typed into an
   entry appears here at once; entries not yet cleared for publication are
   drawn faintly, and the strict, consent-filtered plate is what every export
   shows. Coastline: Natural Earth 1:110m land (public domain), vendored as
   one SVG path in vendor/land.js. A pure renderer over data, so the static
   finding aid can reuse it. */

LC.Atlas = (function () {
  const U = LC.util;
  const W = 1000, H = 500;

  const px = lon => (lon + 180) / 360 * W;
  const py = lat => (90 - lat) / 180 * H;

  function plateSVG(points) {
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="World map of places of last record">';
    for (let lon = -150; lon <= 150; lon += 30) s += '<line class="grat" x1="' + px(lon) + '" y1="0" x2="' + px(lon) + '" y2="' + H + '"/>';
    for (let lat = -60; lat <= 60; lat += 30) s += '<line class="grat" x1="0" y1="' + py(lat) + '" x2="' + W + '" y2="' + py(lat) + '"/>';
    s += '<path class="coast" d="' + (window.LC && LC.LAND ? LC.LAND : '') + '"/>';
    /* preview points first, so publishable ones sit on top */
    points.slice().sort((a, b) => (a.state === 'preview' ? 0 : 1) - (b.state === 'preview' ? 0 : 1)).forEach(p => {
      const x = px(p.lon), y = py(p.lat);
      const cls = 'site' + (p.state === 'preview' ? ' preview' : '');
      s += '<g class="' + cls + '" data-id="' + U.esc(p.id) + '">' +
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
    const round1 = x => Math.round(x * 10) / 10;
    const rs = (data.records || []).filter(r => !r.struck);
    const located = rs.filter(r => r.location && (r.location.place || (typeof r.location.lat === 'number' && typeof r.location.lon === 'number')));
    const hasCoords = r => typeof r.location.lat === 'number' && typeof r.location.lon === 'number';
    const publishable = r => (opts.publicOnly || r.publish) && r.location.publish !== 'withheld';
    /* why an entry is not on the published plate */
    const heldReason = r => !r.publish ? 'entry held back' : (r.location.publish === 'withheld' ? 'place withheld' : '');

    /* the rows the gazetteer lists: in an export, only the publishable; in the
       working view, every located entry, so the cataloguer sees their work */
    const rows = opts.publicOnly ? located.filter(publishable) : located;

    /* the points plotted: publishable ones rounded as they would publish;
       in the working view, the rest too, drawn faintly */
    const points = rows.filter(hasCoords).map(r => {
      const pub = publishable(r);
      const approx = r.location.publish === 'approximate';
      const showApprox = pub && approx;          /* mirror the export rounding */
      return {
        id: r.id, state: pub ? 'publish' : 'preview', approx: showApprox,
        lat: showApprox ? round1(r.location.lat) : r.location.lat,
        lon: showApprox ? round1(r.location.lon) : r.location.lon,
      };
    });
    const previewCount = opts.publicOnly ? 0 : rows.filter(r => !publishable(r)).length;
    const withheldFromExport = located.filter(r => !publishable(r)).length;

    let h = '<h2 class="head">Atlas</h2>' +
      '<p class="subhead">' + (opts.publicOnly
        ? 'places of last record, published only with consent'
        : 'places of last record; entries not yet published are shown faintly') + '</p>';

    h += '<div class="atlas-plate"><div class="inner">' + plateSVG(points) +
      '<div class="atlas-caption">' + (opts.publicOnly
        ? 'Places of last record · published locations only · equirectangular'
        : 'Places of last record · working view · equirectangular') +
      '</div></div></div>';

    if (rows.length) {
      h += '<table class="gazetteer"><thead><tr><th>No.</th><th>Entry</th><th>Place</th><th>Coordinates</th><th>Status</th></tr></thead><tbody>';
      rows.forEach(r => {
        const st = LC.vocab.statusOf(r.status);
        const loc = r.location;
        const pub = publishable(r);
        const approx = loc.publish === 'approximate';
        let coords = '';
        if (hasCoords(r)) {
          const showApprox = (!opts.publicOnly && approx) || (pub && approx);
          const la = (pub && approx) ? round1(loc.lat) : loc.lat;
          const lo = (pub && approx) ? round1(loc.lon) : loc.lon;
          coords = Math.abs(la).toFixed(showApprox ? 1 : 3) + (la >= 0 ? ' N' : ' S') + ', ' +
            Math.abs(lo).toFixed(showApprox ? 1 : 3) + (lo >= 0 ? ' E' : ' W') + (approx ? ' · approx.' : '');
        } else {
          coords = '<span class="gaz-state">no coordinates yet</span>';
        }
        const reason = !opts.publicOnly && !pub ? '<div class="gaz-state">' + heldReason(r) + '</div>' : '';
        h += '<tr class="row' + (pub ? '' : ' preview') + '" data-id="' + U.esc(r.id) + '">' +
          '<td class="no"><a class="entry-link" href="#/entry/' + U.esc(r.id) + '">' + U.esc(r.id) + '</a></td>' +
          '<td>' + U.esc(LC.Model.title(r)) + '</td>' +
          '<td>' + U.esc(loc.place || '') + '</td>' +
          '<td class="coords">' + coords + reason + '</td>' +
          '<td><span class="mark ' + st.cls + '" style="font-size:11.5px;padding:4px 7px 3px">' + U.esc(st.label) + '</span></td></tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<p class="hint" style="margin-top:26px;font-style:italic">Nothing is plotted yet. Type a place into an entry (a town, or a specific place ending in a town) and it appears here.</p>';
    }

    if (opts.publicOnly && withheldFromExport > 0) {
      h += '<p class="stats-note">' + withheldFromExport + ' recorded ' + (withheldFromExport === 1 ? 'place is' : 'places are') +
        ' withheld from this document.</p>';
    } else if (!opts.publicOnly && previewCount > 0) {
      h += '<p class="stats-note">' + previewCount + (previewCount === 1 ? ' place is' : ' places are') +
        ' shown faintly: held back from publication, or with the place set to withheld. They will not appear in any export until you publish them.</p>';
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
