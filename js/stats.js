/* stats.js: the reckoning. Counts by status, certainty, and consent, set as
   a ledger summary with tally strokes. A pure renderer over data, so the
   static finding aid can reuse it unchanged. */

LC.Stats = (function () {
  const U = LC.util;

  /* tally strokes in groups of five: four uprights and a cross-stroke */
  function tallySVG(n) {
    if (!n) return '';
    const capped = Math.min(n, 75);
    const groups = Math.ceil(capped / 5);
    const W = groups * 27, H = 22;
    let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">';
    let left = capped;
    for (let g = 0; g < groups; g++) {
      const x0 = g * 27;
      const inGroup = Math.min(left, 5);
      for (let i = 0; i < Math.min(inGroup, 4); i++) {
        const x = x0 + 2 + i * 5;
        s += '<line x1="' + x + '" y1="3" x2="' + x + '" y2="19" stroke="currentColor" stroke-width="1.4"/>';
      }
      if (inGroup === 5) {
        s += '<line x1="' + (x0 - 1) + '" y1="17" x2="' + (x0 + 20) + '" y2="4" stroke="currentColor" stroke-width="1.4"/>';
      }
      left -= inGroup;
    }
    s += '</svg>';
    return s + (n > 75 ? '<span style="font-family:var(--mono);font-size:12px"> +' + (n - 75) + '</span>' : '');
  }

  function html(data, opts) {
    opts = opts || {};
    const all = data.records || [];
    const rs = all.filter(r => !r.struck);     /* struck entries are cancelled lines, not counts */
    const struckN = all.length - rs.length;
    const evidence = rs.flatMap(r => r.evidence || []);
    const copies = rs.flatMap(r => r.copies || []);
    const located = rs.filter(r => r.location && (r.location.place || (typeof r.location.lat === 'number' && typeof r.location.lon === 'number')));
    const safe = located.filter(r => r.location.safe);

    let h = '<h2 class="head">Statistics</h2>' +
      '<p class="subhead">what the register holds, counted</p>';

    h += '<div class="stats-grid">' +
      cell(rs.length, rs.length === 1 ? 'entry' : 'entries') +
      cell(evidence.length, 'items of evidence') +
      cell(copies.length, 'surviving copies') +
      cell(located.length, 'places recorded') +
      '</div>';

    h += '<h3 class="head" style="font-size:19px;margin-top:40px">By status</h3>';
    h += '<table class="tally">';
    LC.vocab.STATUS.forEach(st => {
      const n = rs.filter(r => r.status === st.key).length;
      h += '<tr><td class="k"><span class="mark ' + st.cls + '">' + U.esc(st.label) + '</span></td>' +
        '<td class="bar ' + st.cls + '">' + tallySVG(n) + '</td>' +
        '<td class="n">' + n + '</td></tr>';
    });
    h += '</table>';

    h += '<h3 class="head" style="font-size:19px;margin-top:40px">By certainty</h3>';
    h += '<table class="tally">';
    LC.vocab.CERTAINTY.forEach(c => {
      const n = rs.filter(r => r.certainty === c.key).length;
      h += '<tr><td class="k"><span class="cert"><span class="pt">' + c.pt + '</span>' + c.label + '</span></td>' +
        '<td class="bar" style="color:var(--ink-2)">' + tallySVG(n) + '</td>' +
        '<td class="n">' + n + '</td></tr>';
    });
    h += '</table>';

    if (!opts.publicOnly) {
      const byConsent = k => evidence.filter(e => e.consent === k).length;
      h += '<h3 class="head" style="font-size:19px;margin-top:40px">Evidence by consent</h3>';
      h += '<table class="tally">';
      LC.vocab.CONSENT.forEach(c => {
        const n = byConsent(c.key);
        h += '<tr><td class="k"><span class="consent ' + c.key + '">' + c.label + '</span></td>' +
          '<td class="bar" style="color:var(--ink-2)">' + tallySVG(n) + '</td>' +
          '<td class="n">' + n + '</td></tr>';
      });
      h += '</table>';
      h += '<p class="stats-note">Restricted and embargoed evidence is counted here but never exported. ' +
        'Of the ' + located.length + ' recorded ' + (located.length === 1 ? 'place' : 'places') + ', ' +
        safe.length + (safe.length === 1 ? ' is' : ' are') + ' marked safe to publish.' +
        (struckN ? ' ' + struckN + ' struck ' + (struckN === 1 ? 'entry remains' : 'entries remain') +
          ' in the ledger as cancelled lines, outside these counts and every export.' : '') + '</p>';
    } else {
      h += '<p class="stats-note">Counts cover the published register. Evidence held under restriction, and places not marked safe to publish, are reflected in the working register only.</p>';
    }
    return h;

    function cell(big, what) {
      return '<div class="stat-cell"><div class="big">' + big + '</div><div class="what">' + U.esc(what) + '</div></div>';
    }
  }

  function render() {
    const sect = document.getElementById('view-statistics');
    sect.innerHTML = '<div class="sheet narrow">' + html({ project: LC.state.project, records: LC.state.records }, {}) + '</div>';
  }

  return { html, render };
})();
