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

## The five folios

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

**Timeline.** The chronology of disappearance: every entry ordered by the
moment it was last seen, year by year, with the loss events set among them as
notices. The events themselves (a fire, a sale, a flood) are kept on this
folio: name, date, place, and a note, so the destruction is treated as a
historical object in its own right, not a phrase repeated across records.

**Statistics.** The reckoning: counts by status, by certainty, by consent,
and by loss event, set with tally strokes.

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
- **A loss event**: which fire, sale, flood, or clearance the entry belongs
  to, drawn from the project's event list.
- **Relations**: typed links to other entries (part of, contains, copy of,
  has copy, related to). You record one direction; the other side is implied
  and shown automatically, so the glass-plate cabinet *contains* its
  negatives without anyone typing it twice.
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
project file. This is a default, not an option to remember. An embargo can
carry a **date**: when it passes, Lacuna points it out gently, and the
consent state still changes only by your hand, because a lapsed date is a
prompt for a human decision, not a switch.

The same defaults govern the **entry itself**. Every entry starts **held
back from publication**: catalogued, counted, searchable in your working
register, but absent from every export until you tick *publish this entry*.
A community can keep a whole record while withholding it, and the finding
aid says so plainly: "3 further entries are recorded in the working register
and not published here," which is itself a statement.

**Places** have three states. *Withheld* (the default) keeps a location out
of everything. *Approximate* publishes it rounded to about 10 km, findable
but not targetable. *Exact* publishes it precisely. Locations can endanger
people and sites; nothing is published until you say how.

---

## Surviving copies

Where some version of a lost work still exists, list its holders: institution,
identifier, a web address, and (when the holder publishes one) a **IIIF**
address. Paste a IIIF image or manifest and the notice gets a **Look** button
that opens the copy as a deep-zoom image, tile by tile, right inside the
entry. Plain image links work too.

---

## Bringing work in

Reconstruction rarely starts from nothing; it starts from an old inventory,
a dealer's list, an accession ledger. From the **Project** menu:

- **Import entries (.csv).** A spreadsheet becomes draft entries. Lacuna
  reads the column names it recognises (title, creator, date, medium,
  status, last seen, place, and so on, including its own CSV export) and
  tells you which columns it could not place. Imported entries arrive held
  back from publication, like everything else here.
- **Merge a project (.json).** Two people catalogue in parallel, no server
  involved, then one merges the other's file. New entries are added; where
  the same entry differs in both registers, the conflicts are laid out side
  by side and you choose which version stands, with the newer one suggested.
- **Check evidence files.** Point Lacuna at the files in your evidence
  folder and it verifies each against the sha-256 fingerprint recorded when
  it was attached: a fixity check, in the preservation sense. Single items
  can also be verified from their entry.

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
  project: {...}, records: [...] }`. The project carries the front matter
  and the loss events (`events: [{ id, name, date, place, note }]`). Records
  carry titles (with language codes), descriptive fields, status, certainty,
  last-seen, an `eventId`, typed `relations` (one direction stored, the
  inverse computed), narrative, tags, a location whose `publish` field is
  `withheld`, `approximate`, or `exact`, an evidence list (type, file
  metadata or URL, sha-256, rights, consent with an optional embargo `until`
  date, note, thumbnail), surviving copies (institution, identifier, IIIF
  and web addresses), and the `publish` and `struck` flags. Files saved by
  earlier versions load cleanly; the old boolean `safe` becomes `exact`.
- **Autosave** uses `localStorage`, debounced; the project file on disk is
  the durable copy. Hand-edited or older files are normalized on load.
- **Hashing** uses WebCrypto's SHA-256 with a small pure-JS fallback.
  Thumbnails are made on a canvas at 280 px and stored as compact JPEG data
  URLs inside the project file.
- **Exports** are filtered through a public clone of the data: only entries
  marked `publish` and not struck are included; evidence is kept only when
  its consent state is `public`; approximate locations are rounded to one
  decimal degree and withheld ones removed; relations survive only when both
  ends are published, so a public entry never reveals a held-back one. The
  finding aid inlines the stylesheet and embeds the fonts as data URLs, so
  the single file stands alone.
- **CSV import** matches header names case-insensitively after stripping
  punctuation (`title`, `creator`/`maker`/`artist`, `date`, `medium`,
  `origin`/`collection`, `status`, `certainty`, `last_seen_date`/`place`/
  `source`, `narrative`/`notes`, `tags`, `place`, `latitude`, `longitude`,
  `id`); its own register export round-trips. **Merge** reconciles by entry
  id: identical entries pass silently, new ones are added, and true
  conflicts are decided by hand, defaulting to the newer `modified` stamp.
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
│   ├── timeline.js     # the chronicle, and the keeping of loss events
│   ├── stats.js        # tallies
│   ├── atlas.js        # the world plate and gazetteer
│   ├── citation.js     # Chicago / MLA / APA / BibTeX per entry
│   ├── importers.js    # CSV import, project merge, fixity checks
│   ├── exporters.js    # finding aid, CSV, public JSON, project file
│   └── app.js          # routes, menus, dialogs, wiring
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
> 1.2.0, Material / Image Research Lab, UC Santa Barbara, 2026,
> https://github.com/mirl-ucsb/mirl-lacuna.

---

Built at the [Material / Image Research Lab](https://mirl.arthistory.ucsb.edu),
Department of History of Art & Architecture, UC Santa Barbara.
Released under the MIT License. OpenSeadragon is BSD-licensed; the coastline
is Natural Earth (public domain); Spectral, IBM Plex Mono, and Noto Naskh
Arabic are under the SIL Open Font License.
