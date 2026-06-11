/* importers.js: ways work enters the register. A CSV of an old inventory
   becomes draft entries; a colleague's project file merges in, with
   conflicts decided by a human; and the evidence folder can be checked
   against its recorded sha-256 fingerprints. Imported entries arrive held
   back from publication, like everything else here: consent first. */

LC.Importers = (function () {
  const S = LC.state;
  const U = LC.util;

  /* ---------- a small, careful CSV parser: quotes, commas, newlines ---------- */
  function parseCSV(text) {
    const rows = [];
    let row = [], cur = '', q = false;
    text = String(text).replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; } else q = false;
        } else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
  }

  /* header names from our own CSV export, and the names old inventories use */
  const HEADER_MAP = {
    id: 'id', no: 'id', number: 'id', entryno: 'id',
    title: 'title', name: 'title', work: 'title',
    paralleltitles: 'titles2', paralleltitle: 'titles2',
    creator: 'creator', maker: 'creator', artist: 'creator', photographer: 'creator', author: 'creator',
    date: 'date', dateofthework: 'date', year: 'date',
    medium: 'medium', material: 'medium', materials: 'medium',
    originatingcollection: 'origin', origin: 'origin', collection: 'origin', archive: 'origin', repository: 'origin', fonds: 'origin',
    status: 'status', fate: 'status',
    certainty: 'certainty',
    lastseendate: 'lsDate', lastseen: 'lsDate',
    lastseenplace: 'lsPlace',
    lastseensource: 'lsSource', source: 'lsSource',
    narrative: 'note', note: 'note', notes: 'note', description: 'note',
    tags: 'tags', keywords: 'tags', subjects: 'tags',
    place: 'place', location: 'place', site: 'place',
    latitude: 'lat', lat: 'lat',
    longitude: 'lon', lon: 'lon', lng: 'lon',
  };
  const normHeader = h => String(h || '').toLowerCase().replace(/[^a-z]/g, '');

  function statusKey(v) {
    v = String(v || '').trim().toLowerCase();
    const hit = LC.vocab.STATUS.find(s => s.key === v || s.label.toLowerCase() === v);
    return hit ? hit.key : null;
  }
  function certaintyKey(v) {
    v = String(v || '').trim().toLowerCase();
    const hit = LC.vocab.CERTAINTY.find(c => c.key === v || c.label === v);
    return hit ? hit.key : null;
  }

  /* rows in, draft records out; every import arrives unpublished */
  function importCSV(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('The file needs a header row and at least one entry.');
    const fields = rows[0].map(h => HEADER_MAP[normHeader(h)] || null);
    const unmatched = rows[0].filter((h, i) => !fields[i] && String(h).trim() !== '');
    let added = 0, renumbered = 0;

    rows.slice(1).forEach(cells => {
      const v = {};
      fields.forEach((f, i) => {
        if (f && cells[i] != null && String(cells[i]).trim() !== '') v[f] = String(cells[i]).trim();
      });
      if (!Object.keys(v).length) return;

      const r = LC.Model.newRecord();
      if (v.id) {
        if (S.records.some(x => x.id === v.id)) renumbered++;
        else r.id = v.id;
      }
      r.titles = [{ text: v.title || 'Untitled', lang: '' }];
      if (v.titles2) v.titles2.split(/\s*\|\s*/).filter(Boolean).forEach(t => r.titles.push({ text: t, lang: '' }));
      if (v.creator) r.creator = v.creator;
      if (v.date) r.date = v.date;
      if (v.medium) r.medium = v.medium;
      if (v.origin) r.origin = v.origin;
      if (v.status) r.status = statusKey(v.status) || r.status;
      if (v.certainty) r.certainty = certaintyKey(v.certainty) || r.certainty;
      if (v.lsDate) r.lastSeen.date = v.lsDate;
      if (v.lsPlace) r.lastSeen.place = v.lsPlace;
      if (v.lsSource) r.lastSeen.source = v.lsSource;
      if (v.note) r.note = v.note;
      if (v.tags) r.tags = v.tags.split(/[|;,]/).map(s => s.trim()).filter(Boolean);
      if (v.place) r.location.place = v.place;
      const lat = parseFloat(v.lat), lon = parseFloat(v.lon);
      if (isFinite(lat)) r.location.lat = lat;
      if (isFinite(lon)) r.location.lon = lon;

      S.records.push(r);
      added++;
    });

    S.project.modified = U.nowISO();
    return { added, renumbered, unmatched };
  }

  /* ---------- merging a colleague's project file ---------- */
  function contentKey(r) {
    const c = JSON.parse(JSON.stringify(r));
    delete c.created; delete c.modified;
    return JSON.stringify(c);
  }

  /* what a merge would do: new entries, identical ones, and true conflicts */
  function planMerge(data) {
    if (!data || data.format !== 'mirl-lacuna' || !Array.isArray(data.records)) {
      throw new Error('Not a Lacuna project file.');
    }
    const incoming = data.records.map(LC.Model.normalize);
    const plan = { newRecords: [], conflicts: [], identical: 0, newEvents: [] };
    incoming.forEach(inc => {
      const local = LC.Model.get(inc.id);
      if (!local) plan.newRecords.push(inc);
      else if (contentKey(local) === contentKey(inc)) plan.identical++;
      else plan.conflicts.push({ id: inc.id, local, incoming: inc });
    });
    ((data.project && data.project.events) || []).forEach(ev => {
      if (ev && ev.id && !(S.project.events || []).some(x => x.id === ev.id)) {
        plan.newEvents.push({ id: ev.id, name: ev.name || '', date: ev.date || '', place: ev.place || '', note: ev.note || '' });
      }
    });
    return plan;
  }

  /* choices: { entryId: 'mine' | 'theirs' }; anything unchosen keeps mine */
  function applyMerge(plan, choices) {
    plan.newRecords.forEach(r => S.records.push(r));
    plan.conflicts.forEach(c => {
      if ((choices && choices[c.id]) === 'theirs') {
        const i = S.records.findIndex(x => x.id === c.id);
        if (i >= 0) S.records[i] = c.incoming;
      }
    });
    plan.newEvents.forEach(e => S.project.events.push(e));
    S.project.modified = U.nowISO();
  }

  /* ---------- fixity: the evidence folder against its fingerprints ---------- */
  async function checkFiles(files) {
    const results = [];
    for (const f of files) {
      const matches = [];
      S.records.forEach(r => (r.evidence || []).forEach(e => {
        if (e.file && e.file.name === f.name && e.sha256) matches.push({ r, e });
      }));
      if (!matches.length) {
        results.push({ name: f.name, entry: '', verdict: 'unknown' });
        continue;
      }
      let hash = null;
      try { hash = await LC.Hash.sha256(await f.arrayBuffer()); } catch (err) {}
      matches.forEach(m => results.push({
        name: f.name, entry: m.r.id,
        verdict: hash && hash === m.e.sha256 ? 'verified' : 'mismatch',
      }));
    }
    return results;
  }

  return { parseCSV, importCSV, planMerge, applyMerge, checkFiles };
})();
