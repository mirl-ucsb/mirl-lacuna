/* timeline.js: the chronicle. The atlas covers space; this folio covers
   time: entries ordered by when each thing was last seen, with the loss
   events set among them as notices. Events themselves are kept here too.
   The chronicle renderer is a pure function over data so the static
   finding aid can reuse it unchanged. */

LC.Timeline = (function () {
  const S = LC.state;
  const U = LC.util;
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];

  /* read a year (and month, when named) out of a free-text date */
  function parseWhen(s) {
    s = String(s || '');
    const y = /(\d{4})/.exec(s);
    if (!y) return null;
    let month = 0;
    MONTHS.forEach((m, i) => { if (s.toLowerCase().includes(m)) month = i + 1; });
    return { year: +y[1], month, key: +y[1] * 100 + month };
  }

  function entryLine(r) {
    const st = LC.vocab.statusOf(r.status);
    return '<div class="tl-item" data-id="' + U.esc(r.id) + '">' +
      '<span class="when">' + U.esc(r.lastSeen.date || '') + '</span>' +
      '<span class="no">' + U.esc(r.id) + '</span>' +
      '<span class="what"' + (U.isRTL(LC.Model.title(r)) ? ' dir="rtl"' : '') + '>' + U.esc(LC.Model.title(r)) +
      (r.creator ? '<span class="by">' + U.esc(r.creator) + '</span>' : '') + '</span>' +
      '<span class="mark ' + st.cls + '">' + U.esc(st.label) + '</span></div>';
  }

  function eventBlock(ev, count) {
    let h = '<div class="tl-event"><div class="ev-tag">Loss event' + (ev.date ? ' · ' + U.esc(ev.date) : '') + '</div>';
    h += '<div class="ev-name">' + U.esc(ev.name || 'Unnamed event') + '</div>';
    if (ev.place) h += '<div class="ev-place">' + U.esc(ev.place) + '</div>';
    if (ev.note) h += '<div class="ev-note">' + U.esc(ev.note) + '</div>';
    if (count) h += '<div class="ev-count">' + count + (count === 1 ? ' entry' : ' entries') + ' in this register</div>';
    return h + '</div>';
  }

  function yearHead(label) {
    return '<div class="tl-yearhead"><span class="y">' + U.esc(label) + '</span><span class="rule"></span></div>';
  }

  function html(data, opts) {
    opts = opts || {};
    const rs = (data.records || []).filter(r => !r.struck);
    const events = (data.project && data.project.events) || [];

    const items = [];
    rs.forEach(r => items.push({ kind: 'entry', when: parseWhen(r.lastSeen && r.lastSeen.date), r }));
    events.forEach(ev => items.push({
      kind: 'event', when: parseWhen(ev.date), ev,
      count: rs.filter(r => r.eventId === ev.id).length,
    }));

    const dated = items.filter(i => i.when).sort((a, b) =>
      a.when.key - b.when.key ||
      (a.kind === b.kind ? 0 : a.kind === 'event' ? -1 : 1) ||
      String(a.kind === 'entry' ? a.r.id : a.ev.id).localeCompare(String(b.kind === 'entry' ? b.r.id : b.ev.id)));
    const undatedEntries = items.filter(i => !i.when && i.kind === 'entry');
    const undatedEvents = items.filter(i => !i.when && i.kind === 'event');

    let h = '<h2 class="head">Timeline</h2>' +
      '<p class="subhead">the chronology of disappearance: each thing by the moment it was last seen</p>';

    if (!dated.length && !undatedEntries.length && !undatedEvents.length) {
      h += '<p class="hint" style="font-style:italic">Nothing is dated yet. The chronicle draws on each entry\'s last-seen date, and on the loss events kept on this folio.</p>';
      return h;
    }

    let year = null;
    dated.forEach(i => {
      if (i.when.year !== year) { year = i.when.year; h += yearHead(String(year)); }
      h += i.kind === 'event' ? eventBlock(i.ev, i.count) : entryLine(i.r);
    });

    if (undatedEntries.length || undatedEvents.length) {
      h += yearHead('Undated');
      undatedEvents.forEach(i => { h += eventBlock(i.ev, i.count); });
      undatedEntries.forEach(i => { h += entryLine(i.r); });
    }
    return h;
  }

  /* ----- the working view: the chronicle plus the keeping of events ----- */

  function evField(ev, key, label, ph, redrawChronicle) {
    const input = U.h('input', { type: 'text', value: ev[key] || '', placeholder: ph || '' });
    input.addEventListener('input', () => {
      ev[key] = input.value;
      S.project.modified = U.nowISO();
      LC.Store.save();
      redrawChronicle();
    });
    return U.h('div', { class: 'field' }, U.h('label', null, label), input);
  }

  function manager(redrawChronicle) {
    const det = U.h('details', null, U.h('summary', null, 'Events'));
    const box = U.h('div', { class: 'fm-form' });
    const redraw = () => {
      box.innerHTML = '';
      (S.project.events || []).forEach(ev => {
        const item = U.h('div', { class: 'item' },
          U.h('div', { class: 'item-head' },
            U.h('span', { class: 'n' }, ev.id),
            U.h('span', { class: 'sp' }),
            U.h('button', {
              class: 'act', onclick: () => {
                const cleared = LC.Model.removeEvent(ev.id);
                LC.Store.save();
                U.toast('Event removed' + (cleared ? '; cleared from ' + cleared + (cleared === 1 ? ' entry' : ' entries') : ''));
                redraw(); redrawChronicle();
              },
            }, 'Remove')),
          evField(ev, 'name', 'Name of the event', 'e.g. The fire of 1976', redrawChronicle),
          U.h('div', { class: 'row2' },
            evField(ev, 'date', 'When', 'e.g. February 1976', redrawChronicle),
            evField(ev, 'place', 'Where', 'place', redrawChronicle)),
          evField(ev, 'note', 'Note', 'what happened, in a sentence or two', redrawChronicle));
        box.append(item);
      });
      box.append(U.h('div', { class: 'add-line' }, U.h('button', {
        class: 'act', onclick: () => {
          LC.Model.addEvent();
          LC.Store.save();
          redraw();
        },
      }, '+ Add an event')));
    };
    redraw();
    det.append(box);
    return U.h('div', { class: 'frontmatter', style: { margin: '30px 0 0' } },
      det,
      U.h('div', { class: 'fm-line', style: { marginTop: '10px' } },
        'Assign entries to an event from the cataloguer\'s desk; the statistics folio counts what each event took.'));
  }

  function render() {
    const sect = document.getElementById('view-timeline');
    sect.innerHTML = '';
    const sheet = U.h('div', { class: 'sheet narrow' });
    const chronicle = U.h('div', { id: 'tl-chronicle' });
    let timer = null;
    const redrawChronicle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        chronicle.innerHTML = html({ project: S.project, records: S.records }, {});
        wire(chronicle);
      }, 300);
    };
    chronicle.innerHTML = html({ project: S.project, records: S.records }, {});
    sheet.append(manager(redrawChronicle), chronicle);
    sect.append(sheet);
    wire(chronicle);
  }

  function wire(root) {
    root.querySelectorAll('.tl-item[data-id]').forEach(el => {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      const rec = LC.Model.get(el.dataset.id);
      el.setAttribute('aria-label', 'Open ' + (rec ? LC.Model.title(rec) : el.dataset.id));
      const go = () => { location.hash = '#/entry/' + el.dataset.id; };
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  return { html, render };
})();
