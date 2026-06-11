# MIRL Lacuna

**A catalogue for what is gone.**

MIRL Lacuna is a free, local-first cataloguer for archives that no longer
exist. Most collection software assumes the object is on a shelf; Lacuna
assumes it is not. Each entry records a work that has been destroyed, damaged,
looted, dispersed, or simply lost track of, together with the evidence for
saying so, the people and places involved, and whatever copies or fragments
survive. Absence is a first-class state here, not an error.

It was built for people in the **arts, humanities, and cultural heritage**:
historians, archivists, curators, conservators, community researchers, and
students, working at the scale the big registries do not serve, one scholar
or one community at a time. **You do not need to know how to code to use it.**

The tool opens with a small sample already loaded, the register of an entirely
fictional photographic studio, so you can see how everything works before you
add anything of your own.

---

## What you might use it for

- A **lost collection**: reconstructing, entry by entry, what an archive held
  before a fire, a flood, a war, or a demolition took it.
- **Conflict losses**: works last seen in a museum, a studio, or a family
  house, with testimony and photographs held at the contributors' consent.
- **Colonial dispersal**: objects removed from a community, now scattered
  across institutions, with the surviving copies and their holders listed
  against each entry.
- A **last-seen register** for looted or missing objects: where, when, and on
  whose word.
- **Catalogues raisonnés of destruction**: the dignified record of an artist's
  works that no longer exist.
- Teaching with absence: a seminar building a register as a way of thinking
  about what archives fail to keep.

---

## The four folios

**Register.** The whole archive as a ruled table: number, title, date, medium,
originating collection, status, certainty, last seen. Search it, filter it by
status with the stamped marks, sort it, and click any line to open the entry.

**Entry.** Each record is set as a memorial notice inside a mourning frame:
the title (in any language), what the thing was, what became of it, when it
was last seen and on whose word, the narrative, the evidence, and any
surviving copies. It is a tombstone, not a 404. Below the notice sits **the
cataloguer's desk**, the working form; everything you type appears in the
notice above as you type it.

Entries are **struck, not deleted**. A real ledger never erases; it cancels
visibly. A struck entry stays in the register as a cancelled line, ruled
through, kept out of every export, restorable at any time, and its number is
never reused. (Outright removal exists for mistaken entries, behind a
confirmation.)

**Statistics.** The reckoning: counts by status, by certainty, and by consent,
set with tally strokes.

**Atlas.** Places of last record on a world plate, with a gazetteer beneath.
Only places marked **safe to publish** are ever plotted; the rest are counted,
not shown.

---

## What an entry records

- **Status**, from a controlled vocabulary: destroyed, damaged, looted,
  dispersed, unlocated, survives in copy, survives in fragment.
- **Certainty**: attested, probable, or uncertain, because a register of
  losses should say how it knows.
- **Titles in any language.** Parallel titles each carry a language code, and
  right-to-left scripts (Arabic among them) set themselves correctly in both
  the form and the notice.
- **Last seen**: a date, a place, and a source, the most recent moment anyone
  can vouch for.
- **Narrative note, tags**, and the usual descriptive fields (creator, date,
  medium, originating collection).

---

## Evidence, on the contributors' terms

Each entry carries an evidence list: photographs, documents, citations,
testimony. For every item you can attach a file or point to a web address,
and Lacuna records:

- a **sha-256 fingerprint** of the exact file, computed in your browser, so
  the entry stays evidentially tethered to its source. The file itself never
  leaves your machine; the register keeps its name, the hash, and (for
  images) a small thumbnail.
- **rights** and a **consent state**: public, restricted, or embargoed.

**Restricted and embargoed evidence never enters an export.** Not the CSV,
not the public data file, not the finding aid. It lives only in your own
project file. This is a default, not an option to remember.

The same principle governs **places**: each entry may carry a location, and
every location is unpublishable until you tick *safe to publish*. Locations
can endanger people and sites; the box starts unticked.

---

## Surviving copies

Where some version of a lost work still exists, list its holders: institution,
identifier, a web address, and (when the holder publishes one) a **IIIF**
address. Paste a IIIF image or manifest and the notice gets a **Look** button
that opens the copy as a deep-zoom image, tile by tile, right inside the
entry. Plain image links work too.

---

## Saving and exporting

Your register is **one JSON file**, edited in the browser and autosaved
locally as you work. From the **Project** menu you can save it to disk and
open it again anywhere; nothing is uploaded, ever.

From the **Export** menu:

- **Finding aid (.html)**: the whole register as a single, self-contained
  page (fonts included), ready for a website, an email attachment, or a USB
  stick. It carries the register, every notice, the statistics, and the
  atlas, with all restricted material and unpublished places withheld.
- **Spreadsheet (.csv)** of the register, for sorting and counting elsewhere.
- **Public data (.json)**, the machine-readable register with consent applied.
- **Print this view**, for paper copies of the register or a single notice.

Every entry also writes its own **citation**, in Chicago, MLA, APA, or
BibTeX, naming the work, its fate, and the register that records it.

---

## Running it

MIRL Lacuna is a plain web page with no build step and nothing to install.

- The simplest way: **double-click `index.html`** to open it in your browser.
- If your browser is cautious about local files, or you want to share it on
  the web, serve the folder instead. From the Lacuna folder:

  ```bash
  python3 -m http.server 8000
  ```

  then visit `http://localhost:8000`. It also runs as-is on **GitHub Pages**.

---

## The sample register

The bundled sample records the losses of **Studio al-Qamar of Qamariyya**, a
photographic studio that never existed. The town, the studio, its people, and
every loss in the register are invented, and the sample says so on its own
front page; any resemblance to real people, places, archives, or events is
coincidental. The five evidence images are drawn from scratch, plainly
synthetic, and their sha-256 hashes are true hashes of the shipped files.

To regenerate the sample, run `python3 samples/make-samples.py` (needs
[Pillow](https://python-pillow.org)).

---

## Technical reference

- **One JSON document per project**: `{ format: "mirl-lacuna", version: 1,
  project: {...}, records: [...] }`. Records carry titles (with language
  codes), descriptive fields, status, certainty, last-seen, narrative, tags,
  an optional location with a `safe` flag, an evidence list (type, file
  metadata or URL, sha-256, rights, consent, note, thumbnail), and surviving
  copies (institution, identifier, IIIF and web addresses).
- **Autosave** uses `localStorage`, debounced; the project file on disk is
  the durable copy. Hand-edited or older files are normalized on load.
- **Hashing** uses WebCrypto's SHA-256 with a small pure-JS fallback.
  Thumbnails are made on a canvas at 280 px and stored as compact JPEG data
  URLs inside the project file.
- **Exports** are filtered through a public clone of the data: struck entries
  are left out, evidence is kept only when its consent state is `public`, and
  locations are kept only when `safe` is true. The finding aid inlines the
  stylesheet and embeds the fonts as data URLs, so the single file stands
  alone.
- **Deep zoom and IIIF** are handled by
  [OpenSeadragon](https://openseadragon.github.io) (vendored in `vendor/`,
  no network needed). IIIF Image `info.json` addresses are used directly;
  Presentation manifests (v2 and v3) are resolved to their first image
  service. The source must allow cross-origin access, which almost all IIIF
  servers do.
- **The atlas** is an equirectangular SVG plate. The coastline is Natural
  Earth 1:110m land (public domain), converted once to a single SVG path by
  `vendor/make-land.py`; the app itself never touches the network.
- **Right-to-left scripts** are handled with `dir="auto"` on inputs and
  per-string direction detection in the rendered notice; Arabic text is set
  in Noto Naskh Arabic, vendored alongside Spectral and IBM Plex Mono in
  `fonts/`.
- **No data leaves your machine.** Everything runs in the browser. The only
  network requests Lacuna ever makes are the ones you ask for: opening a
  IIIF copy, or fetching a URL to hash it.

### Layout

```
mirl-lacuna/
├── index.html          # the page
├── css/style.css       # the ledger
├── js/
│   ├── model.js        # vocabularies, state, autosave, sha-256, thumbnails
│   ├── register.js     # the ruled table, filters, front matter
│   ├── record.js       # the memorial notice + the cataloguer's desk + IIIF
│   ├── stats.js        # tallies
│   ├── atlas.js        # the world plate and gazetteer
│   ├── citation.js     # Chicago / MLA / APA / BibTeX per entry
│   ├── exporters.js    # finding aid, CSV, public JSON, project file
│   └── app.js          # routes, menus, wiring
├── vendor/             # openseadragon.min.js · land.js (+ its generator)
├── fonts/              # Spectral, IBM Plex Mono, Noto Naskh Arabic (woff2)
└── samples/            # the fictional studio register + its generator
```

---

## Citing this tool

This repository carries a [`CITATION.cff`](CITATION.cff) file, so GitHub's
**Cite this repository** button (in the sidebar of the repo page) will give
you a reference in APA or BibTeX form. In a note, cite it as:

> Jeff O'Brien, *MIRL Lacuna: a catalogue of an absent archive*, version
> 1.1.0, Material / Image Research Lab, UC Santa Barbara, 2026,
> https://github.com/mirl-ucsb/mirl-lacuna.

---

Built at the [Material / Image Research Lab](https://mirl.arthistory.ucsb.edu),
Department of History of Art & Architecture, UC Santa Barbara.
Released under the MIT License. OpenSeadragon is BSD-licensed; the coastline
is Natural Earth (public domain); Spectral, IBM Plex Mono, and Noto Naskh
Arabic are under the SIL Open Font License.
