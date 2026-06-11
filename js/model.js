/* model.js: namespace, vocabularies, project state, persistence, hashing.
   Absence is a first-class state here: every record carries a status from a
   controlled vocabulary, a certainty, and consent-aware evidence. */

window.LC = window.LC || {};

/* ---------- tiny DOM + misc helpers ---------- */
LC.util = {
  h(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v);
    }
    for (const c of kids) {
      if (c == null || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(c));
    }
    return e;
  },
  esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
  toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(LC._tt); LC._tt = setTimeout(() => t.classList.remove('show'), 2300);
  },
  download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  },
  downloadText(name, text, type = 'text/plain') { this.download(name, new Blob([text], { type })); },
  slug(s) { return String(s || 'register').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'register'; },
  nowISO() { return new Date().toISOString(); },
  /* does a string begin in a right-to-left script (Arabic, Hebrew, Syriac)? */
  isRTL(s) { return /^[\s"'(\[]*[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(String(s || '')); },
  uid() { return 'x' + Math.random().toString(36).slice(2, 9); },
};

/* ---------- controlled vocabularies ---------- */
LC.vocab = {
  /* what has become of the thing */
  STATUS: [
    { key: 'destroyed',  label: 'Destroyed',            cls: 'st-destroyed' },
    { key: 'damaged',    label: 'Damaged',              cls: 'st-damaged' },
    { key: 'looted',     label: 'Looted',               cls: 'st-looted' },
    { key: 'dispersed',  label: 'Dispersed',            cls: 'st-dispersed' },
    { key: 'unlocated',  label: 'Unlocated',            cls: 'st-unlocated' },
    { key: 'copy',       label: 'Survives in copy',     cls: 'st-copy' },
    { key: 'fragment',   label: 'Survives in fragment', cls: 'st-fragment' },
  ],
  /* how firmly the status is known */
  CERTAINTY: [
    { key: 'attested',  label: 'attested',  pt: '●' },   /* filled point */
    { key: 'probable',  label: 'probable',  pt: '◐' },   /* half point */
    { key: 'uncertain', label: 'uncertain', pt: '○' },   /* open point */
  ],
  EVTYPE: ['photograph', 'document', 'citation', 'testimony'],
  CONSENT: [
    { key: 'public',     label: 'public',     gloss: 'may appear in exports and the finding aid' },
    { key: 'restricted', label: 'restricted', gloss: 'kept out of every export by default' },
    { key: 'embargoed',  label: 'embargoed',  gloss: 'kept out of every export by default' },
  ],
  /* how a place may be published */
  LOCPUB: [
    { key: 'withheld',    label: 'Withheld',    gloss: 'kept out of every export and the atlas' },
    { key: 'approximate', label: 'Approximate', gloss: 'published rounded to about 10 km' },
    { key: 'exact',       label: 'Exact',       gloss: 'published precisely' },
  ],
  /* typed links between entries; the inverse is computed, never stored */
  RELATION: [
    { key: 'part-of',  label: 'Part of',    inverse: 'contains' },
    { key: 'contains', label: 'Contains',   inverse: 'part-of' },
    { key: 'copy-of',  label: 'Copy of',    inverse: 'has-copy' },
    { key: 'has-copy', label: 'Has copy',   inverse: 'copy-of' },
    { key: 'related',  label: 'Related to', inverse: 'related' },
  ],
};
LC.vocab.statusOf = k => LC.vocab.STATUS.find(s => s.key === k) || LC.vocab.STATUS[4];
LC.vocab.certaintyOf = k => LC.vocab.CERTAINTY.find(c => c.key === k) || LC.vocab.CERTAINTY[2];
LC.vocab.locpubOf = k => LC.vocab.LOCPUB.find(l => l.key === k) || LC.vocab.LOCPUB[0];
LC.vocab.relationOf = k => LC.vocab.RELATION.find(x => x.key === k) || LC.vocab.RELATION[4];

/* ---------- state ---------- */
LC.blankProject = () => ({
  title: 'Untitled register',
  subtitle: '',
  compiler: '',
  institution: '',
  contact: '',
  note: '',
  events: [],   /* loss events: { id, name, date, place, note } */
  created: LC.util.nowISO(),
  modified: LC.util.nowISO(),
});

LC.state = {
  project: LC.blankProject(),
  records: [],
  route: { view: 'register', id: null },
  filters: { q: '', statuses: [] },
  sort: { by: 'no', dir: 1 },
};

/* ---------- records ---------- */
LC.Model = (function () {
  const S = LC.state;

  function nextId() {
    let max = 0;
    S.records.forEach(r => { const m = /^LAC-(\d+)$/.exec(r.id || ''); if (m) max = Math.max(max, +m[1]); });
    return 'LAC-' + String(max + 1).padStart(4, '0');
  }

  function newRecord() {
    return {
      id: nextId(),
      titles: [{ text: '', lang: '' }],
      creator: '', date: '', medium: '', origin: '',
      status: 'unlocated', certainty: 'uncertain',
      lastSeen: { date: '', place: '', source: '' },
      note: '', tags: [],
      eventId: null,        /* the loss event this entry belongs to */
      relations: [],        /* typed links: { type, target } */
      location: { place: '', lat: null, lon: null, publish: 'withheld' },
      evidence: [], copies: [],
      publish: false,       /* entries are held back until the cataloguer says otherwise */
      struck: false,        /* a struck entry stays as a cancelled line; never erased */
      created: LC.util.nowISO(), modified: LC.util.nowISO(),
    };
  }

  /* fill in anything missing so older or hand-edited files load cleanly */
  function normalize(r) {
    const d = newRecord();
    const out = Object.assign({}, d, r);
    out.titles = Array.isArray(r.titles) && r.titles.length ? r.titles.map(t => ({ text: t.text || '', lang: t.lang || '' })) : d.titles;
    out.lastSeen = Object.assign({}, d.lastSeen, r.lastSeen || {});
    out.location = Object.assign({}, d.location, r.location || {});
    /* files saved before locations had three publication states used a
       boolean "safe"; carry it across */
    if (!LC.vocab.LOCPUB.some(l => l.key === out.location.publish)) {
      out.location.publish = (r.location && r.location.safe) ? 'exact' : 'withheld';
    }
    delete out.location.safe;
    out.tags = Array.isArray(r.tags) ? r.tags.filter(Boolean) : [];
    out.eventId = typeof r.eventId === 'string' && r.eventId ? r.eventId : null;
    out.relations = (Array.isArray(r.relations) ? r.relations : [])
      .filter(x => x && x.target && LC.vocab.RELATION.some(v => v.key === x.type))
      .map(x => ({ type: x.type, target: x.target }));
    out.publish = !!r.publish;
    out.struck = !!r.struck;
    out.evidence = (Array.isArray(r.evidence) ? r.evidence : []).map(e => Object.assign({
      id: LC.util.uid(), type: 'photograph', label: '', file: null, url: '', archived: '',
      sha256: '', rights: '', consent: 'restricted', until: '', note: '', thumb: '',
    }, e));
    out.copies = (Array.isArray(r.copies) ? r.copies : []).map(c => Object.assign({
      id: LC.util.uid(), institution: '', identifier: '', iiif: '', url: '', note: '',
    }, c));
    if (!LC.vocab.STATUS.some(s => s.key === out.status)) out.status = 'unlocated';
    if (!LC.vocab.CERTAINTY.some(c => c.key === out.certainty)) out.certainty = 'uncertain';
    return out;
  }

  function get(id) { return S.records.find(r => r.id === id) || null; }

  function add() {
    const r = newRecord();
    S.records.push(r);
    touch(r);
    return r;
  }

  function remove(id) {
    const i = S.records.findIndex(r => r.id === id);
    if (i >= 0) S.records.splice(i, 1);
    S.project.modified = LC.util.nowISO();
  }

  function touch(r) {
    if (r) r.modified = LC.util.nowISO();
    S.project.modified = LC.util.nowISO();
  }

  function title(r, alt) {
    const ts = (r.titles || []).filter(t => t.text && t.text.trim());
    if (!ts.length) return alt ? '' : 'Untitled';
    return ts[0].text.trim();
  }
  function altTitles(r) {
    return (r.titles || []).slice(1).filter(t => t.text && t.text.trim());
  }

  /* ---------- the whole project as one JSON document ---------- */
  function serialize(publicOnly) {
    const src = publicOnly ? publicClone() : { project: S.project, records: S.records };
    return {
      format: 'mirl-lacuna',
      version: 1,
      project: src.project,
      records: src.records,
    };
  }

  /* a copy fit to publish: only entries marked publish, never struck ones;
     restricted and embargoed evidence withheld; places withheld or rounded
     unless marked exact; relations only between published entries */
  function publicClone() {
    const clone = JSON.parse(JSON.stringify({ project: S.project, records: S.records }));
    clone.records = clone.records.filter(r => !r.struck && r.publish);
    const kept = new Set(clone.records.map(r => r.id));
    const round1 = x => Math.round(x * 10) / 10;
    clone.records.forEach(r => {
      r.evidence = (r.evidence || []).filter(e => e.consent === 'public');
      r.relations = (r.relations || []).filter(x => kept.has(x.target));
      const loc = r.location || {};
      const hasCoords = typeof loc.lat === 'number' && typeof loc.lon === 'number';
      if (loc.publish === 'exact') {
        /* published as recorded */
      } else if (loc.publish === 'approximate') {
        r.location = { place: loc.place || '', lat: hasCoords ? round1(loc.lat) : null,
          lon: hasCoords ? round1(loc.lon) : null, publish: 'approximate' };
      } else {
        r.location = { place: '', lat: null, lon: null, publish: 'withheld' };
      }
    });
    return clone;
  }

  /* how many catalogued entries are held back from publication */
  function heldBackCount() {
    return S.records.filter(r => !r.struck && !r.publish).length;
  }

  /* embargo dates that have passed and want a human decision */
  function lapsedEmbargoes() {
    const today = new Date().toISOString().slice(0, 10);
    const out = [];
    S.records.forEach(r => (r.evidence || []).forEach(e => {
      if (e.consent === 'embargoed' && e.until && e.until <= today) {
        out.push({ recordId: r.id, label: e.label || e.type, until: e.until });
      }
    }));
    return out;
  }

  /* ---------- loss events ---------- */
  function eventOf(id) { return (S.project.events || []).find(e => e.id === id) || null; }

  function addEvent() {
    let max = 0;
    (S.project.events || []).forEach(e => { const m = /^evt-(\d+)$/.exec(e.id || ''); if (m) max = Math.max(max, +m[1]); });
    const ev = { id: 'evt-' + (max + 1), name: '', date: '', place: '', note: '' };
    S.project.events.push(ev);
    S.project.modified = LC.util.nowISO();
    return ev;
  }

  function removeEvent(id) {
    S.project.events = (S.project.events || []).filter(e => e.id !== id);
    let cleared = 0;
    S.records.forEach(r => { if (r.eventId === id) { r.eventId = null; cleared++; } });
    S.project.modified = LC.util.nowISO();
    return cleared;
  }

  function loadData(data) {
    if (!data || data.format !== 'mirl-lacuna' || !Array.isArray(data.records)) {
      throw new Error('Not a Lacuna project file.');
    }
    S.project = Object.assign(LC.blankProject(), data.project || {});
    S.project.events = (Array.isArray(S.project.events) ? S.project.events : [])
      .filter(e => e && e.id)
      .map(e => ({ id: e.id, name: e.name || '', date: e.date || '', place: e.place || '', note: e.note || '' }));
    S.records = data.records.map(normalize);
  }

  function reset() {
    S.project = LC.blankProject();
    S.records = [];
  }

  return { newRecord, normalize, nextId, get, add, remove, touch, title, altTitles,
    serialize, publicClone, heldBackCount, lapsedEmbargoes,
    eventOf, addEvent, removeEvent, loadData, reset };
})();

/* ---------- autosave in the browser ---------- */
LC.Store = (function () {
  const KEY = 'mirl-lacuna-project';
  let timer = null, warned = false;

  function save() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const raw = JSON.stringify(LC.Model.serialize(false));
      try {
        localStorage.setItem(KEY, raw);
      } catch (e) {
        if (!warned) {
          warned = true;
          LC.util.toast('Too large to autosave here. Save your project file.');
        }
      }
      LC.Disk.write(raw);
    }, 400);
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      LC.Model.loadData(JSON.parse(raw));
      return true;
    } catch (e) { return false; }
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }

  return { save, load, clear };
})();

/* ---------- a live file on disk (Chromium browsers) ----------
   With the File System Access API the project can save continuously to a
   .json the user chooses, alongside the browser autosave, so a day's
   cataloguing survives anything. The handle is kept in IndexedDB and
   resumed with the user's say-so; everywhere else this stays dormant. */
LC.Disk = (function () {
  let handle = null;        /* active file handle */
  let stored = null;        /* a handle found in IndexedDB, awaiting permission */
  let busy = false, failed = false;

  const supported = () => 'showSaveFilePicker' in window;

  function idb() {
    return new Promise((res, rej) => {
      const o = indexedDB.open('mirl-lacuna', 1);
      o.onupgradeneeded = () => o.result.createObjectStore('kv');
      o.onsuccess = () => res(o.result);
      o.onerror = () => rej(o.error);
    });
  }
  async function kvSet(k, v) {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  async function kvGet(k) {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readonly');
      const rq = tx.objectStore('kv').get(k);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  }

  /* on boot: remember a previous session's file, but write nothing
     until the user resumes it (permission needs their gesture) */
  async function init() {
    if (!supported()) return;
    try { stored = (await kvGet('fileHandle')) || null; } catch (e) { stored = null; }
  }

  function state() {
    if (!supported()) return { mode: 'unsupported' };
    if (handle) return { mode: 'active', name: handle.name };
    if (stored) return { mode: 'pending', name: stored.name };
    return { mode: 'off' };
  }

  async function connect() {
    const name = LC.util.slug(LC.state.project.title) + '.lacuna.json';
    handle = await window.showSaveFilePicker({
      suggestedName: name,
      types: [{ description: 'Lacuna project', accept: { 'application/json': ['.json'] } }],
    });
    stored = null; failed = false;
    try { await kvSet('fileHandle', handle); } catch (e) {}
    await write(JSON.stringify(LC.Model.serialize(false)), true);
    LC.util.toast('Saving to ' + handle.name + ' as you work');
  }

  async function resume() {
    if (!stored) return;
    const perm = await stored.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return LC.util.toast('The browser did not allow it');
    handle = stored; stored = null; failed = false;
    await write(JSON.stringify(LC.Model.serialize(false)), true);
    LC.util.toast('Saving to ' + handle.name + ' as you work');
  }

  async function disconnect() {
    const name = handle && handle.name;
    handle = null; stored = null;
    try { await kvSet('fileHandle', null); } catch (e) {}
    if (name) LC.util.toast('Stopped saving to ' + name + '; the browser autosave continues');
  }

  async function write(raw, loud) {
    if (!handle || busy) return;
    busy = true;
    try {
      const w = await handle.createWritable();
      await w.write(raw);
      await w.close();
      failed = false;
    } catch (e) {
      if (!failed) {
        failed = true;
        LC.util.toast('Could not write to ' + handle.name + (loud ? ': ' + (e.message || e) : '; the browser autosave continues'));
      }
    } finally { busy = false; }
  }

  return { supported, init, state, connect, resume, disconnect, write };
})();

/* ---------- sha-256, so evidence stays evidentially tethered ---------- */
LC.Hash = (function () {
  /* WebCrypto where available (everywhere modern); a small pure-JS
     fallback so hashing still works from unusual contexts. */
  async function sha256(buf) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const d = await crypto.subtle.digest('SHA-256', buf);
      return hex(new Uint8Array(d));
    }
    return jsSha256(new Uint8Array(buf));
  }
  function hex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
    return s;
  }
  function jsSha256(msg) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = msg.length, bitLen = l * 8;
    const padded = new Uint8Array((((l + 9) + 63) >> 6) << 6);
    padded.set(msg); padded[l] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 4, bitLen >>> 0);
    dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
    const w = new Int32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < padded.length; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getInt32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h2] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h2 + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h2 = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = [(H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0,
           (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h2) | 0];
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  /* a small thumbnail for image evidence, kept inside the project file */
  function thumbnail(file) {
    return new Promise(resolve => {
      if (!/^image\//.test(file.type)) return resolve('');
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 280, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        try { resolve(c.toDataURL('image/jpeg', 0.72)); } catch (e) { resolve(''); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
      img.src = url;
    });
  }

  return { sha256, thumbnail };
})();
