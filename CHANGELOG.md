# Changelog

MIRL Lacuna keeps its history the way it asks registers to keep theirs:
nothing erased, each change dated and explained. Versions follow
[semantic versioning](https://semver.org); project files from any earlier
version load cleanly in any later one.

## 1.8.1 (2026-11-06)

Fixes to the 1.8.0 layout, and housekeeping for its fonts and docs. Nothing
about how a register is kept, saved, or protected changes.

- **The register fits its window.** At desktop widths the register table was
  26 pixels wider than its column, and between about 860 and 1200 pixels it
  pushed the whole page sideways. A held-back tag now drops beneath an
  entry's number when space is tight, which brings the table inside its
  column, and below about 1240 pixels the table scrolls within itself, as it
  already did on phones. The gazetteer and tally tables follow the same rule.
- **The toolbar stays on one line.** Between 981 and 1100 pixels the buttons
  Project, Export, and New entry wrapped onto two lines. They no longer
  wrap, and in that range the views take their own row beneath the mark and
  the actions, as they do on a phone.
- **Tables print whole.** On a portrait page, the scroll container added in
  1.8.0 applied to print as well, clipping the right-hand columns of the
  printed register and of the memorial book's appendix. Paper cannot scroll,
  so tables now print in full on any page.
- **Field edges you can see.** The borders of text fields, selects, and text
  areas are now 3.5 to 1 against the page, where they were 1.5 to 1, which
  is the contrast WCAG 1.4.11 asks of a control's boundary.
- **A licence text for every typeface.** The SIL Open Font License texts for
  IBM Plex Mono and Noto Naskh Arabic are now in `fonts/`, beside those for
  Familjen Grotesk and Epilogue. They had never been shipped for these two,
  though the README said they were.
- **Docs.** The README's citation line, credits, and design paragraph now
  match the current release.

## 1.8.0 (2026-11-05)

Lacuna takes MIRL's own identity. Nothing about how a register is kept,
saved, or protected changes; files from every earlier version open as before.

- **The MIRL identity.** Familjen Grotesk for names and headings and Epilogue
  for everything you read and operate, the same faces as the Material /
  Image Research Lab's site, on MIRL's paper white. Lacuna's key is the
  violet of the MIRL Risograph mark, shown as a soft bloom beside its name.
  Both typefaces are vendored in `fonts/` under the SIL Open Font License,
  with their licence texts.
- **Plain words.** Labels, buttons, and statuses are set in sentence case;
  the folio numbers and the stamped capitals are gone. Views are simply
  Register, Entry, Timeline, Statistics, Atlas, and Index.
- **Readable everywhere.** Every text colour now meets WCAG AA (4.5 to 1 or
  better; the quietest grey went from about 3 to 1 to 5.5 to 1). Statuses
  are tinted tags that say what they mean in words as well as colour.
- **A clearer bar.** One sticky line carries the mark, the views, the save
  state, and the actions, with New entry as the single filled button; the
  release preview marks its export as the primary action while focus still
  starts on Cancel.
- **Phones.** Wide tables now scroll within themselves, never the whole page,
  and the bar wraps into a swipeable row of views.
- **Published documents follow.** The finding aid, the memorial book, the
  notice for circulation, the protection page, and the proof sheet carry
  the same type and palette, laid out as documents. The proof sheet still
  stands: 49 of 49.

## 1.7.0 (2026-09-10)

The register protects the machine it runs on.

- **Forget on this device.** For a shared or borrowed machine: one action in
  the Project menu clears everything Lacuna keeps in that browser, the
  autosaved register (locked or not), the session's key, and the remembered
  disk-file connection, and returns the screen to an empty register. The
  dialog warns in red when the register exists nowhere but that browser, and
  offers to save the project file first. Files already saved, and exports
  already made, are untouched.
- **What this protects, and what it does not.** A page of its own, reachable
  from the Project menu, the lock dialog, and the forget dialog, and cached
  for offline use: where the register lives, the four user-initiated moments
  in which anything can leave the machine, what the lock covers and what it
  cannot, shared machines, what exports reveal by design, and what a browser
  tool cannot promise. Trust should rest on facts, not reassurance.
- **The proof sheet.** `tests.html` guards the consent boundary before each
  release: it builds a synthetic register in which every field that must
  never publish carries a marker, runs the public clone and every exporter
  with downloads intercepted, and proves the marker reaches no output, along
  with coordinate rounding, precision round-tripping, source restriction,
  cautious duplication, legacy-file normalisation, and a lock seal-and-unseal
  round trip. It runs in the browser with no build step and never touches the
  autosave.
- Clearing the autosave now also cancels any save still pending, so nothing
  rewrites itself after being forgotten.
- **A fault the proof sheet caught on its first run, fixed.** Files saved
  before locations had three publication states marked a publishable place
  with a boolean `safe`. The migration meant to carry `safe` across as
  `exact` never fired, because it judged the already-defaulted value, so
  those places loaded as withheld: protective in direction, but it discarded
  the cataloguer's recorded decision. The migration now reads the file's own
  value and carries it across.

## 1.6.0 (2026-09-10)

The moment of export becomes a deliberate act.

- **A release preview before anything leaves.** Every public export (finding
  aid, public data, spreadsheet, GeoJSON, memorial book, notice) now opens
  with a plain account of what the export carries and what stays in the
  working file: how many entries publish and how many are held back or
  struck, which evidence and sightings travel, how many places go out exact
  or rounded and how many are withheld, and that the investigation log and
  every identity behind the aliases remain here. Cancel costs nothing;
  exporting is a decision made with the facts in view.
- **Sightings now carry their own consent.** Each sighting is public,
  restricted, or embargoed (with an until date), and new sightings start
  restricted. Only public sightings enter exports and the finding aid, the
  working notice marks the withheld ones, and restricting a source now
  covers their sightings along with their evidence.
- **Places as GeoJSON.** A new export writes the publishable located places
  as a `.geojson` FeatureCollection for QGIS or a web map. It passes through
  the same consent boundary as everything else: published entries only,
  withheld places absent, approximate places already rounded.
- **The place-publication decision round-trips.** CSV import now reads a
  location-precision column (exact, approximate, withheld), so a register
  exported and re-imported keeps each place's publication state instead of
  falling back to withheld.
- **Duplication stays cautious.** Duplicate this entry now resets the copy's
  location to withheld, and an internal flag noting hand-entered coordinates
  no longer travels in exports.
- **More of the page works from the keyboard.** The register's sort headers
  take Tab, Enter, and Space and announce their direction with `aria-sort`;
  the atlas pins, gazetteer rows, and timeline entries are keyboard-operable
  too.
- **Small mercies.** The masthead shows a quiet autosave indicator (Saving,
  then Saved), and Remove it outright now acts at once and offers a
  several-second Undo in place of a confirmation dialog, so a slip is
  recoverable rather than merely warned about.

## 1.5.2 (2026-06-18)

- **Opens to a blank register, not the sample.** A first visit now lands on
  your own empty register; the sample loads only when you ask for it, from a
  clear **Open the sample register** button on the empty register or the
  **Project** menu. Once opened, the sample (or your own work) persists as
  usual.

## 1.5.1 (2026-06-18)

- **Accessibility and keyboard pass.** A visible focus ring for keyboard users
  throughout, a skip link to the register, entry numbers are real links so the
  register, atlas gazetteer, and index can be navigated by keyboard, form
  labels are tied to their fields for screen readers, the dialogs (unlock,
  merge, sources, duplicates, fixity) are proper modals that trap focus, close
  on Escape, and return focus, the menus carry their open state and return
  focus on Escape, the folio nav marks the current page, and the status,
  certainty, and place-publication stamps announce their pressed state.
- **Duplicate this entry.** A new action on the desk makes a held-back copy of
  an entry's descriptive fields (titles, creator, date, medium, collection,
  status, event, place, tags, note) for cataloguing many similar items, while
  leaving the evidence, surviving copies, sightings, status history, and
  investigation log empty, so nothing source-specific or restricted is cloned.

## 1.5.0 (2026-06-17)

- **Type a place, see it on the atlas, no coordinates by hand.** A bundled
  offline gazetteer (built from GeoNames) resolves a typed place as you
  write it: a city ("Beirut"), or a specific place whose name ends in a
  known city ("Institute of Palestine Studies, Beirut"), to a city-level,
  approximate point. This runs entirely in the browser and sends nothing
  anywhere. A trailing country name is read as the country, not a same-named
  town, and a handful of historic and exonymous names (Palmyra, Tombouctou,
  Constantinople) are bridged to their gazetteer entries.
- **Optional online lookup**, only when you press the button, asks
  OpenStreetMap to resolve a specific place precisely. It is the one case
  where a place name leaves the machine, and it is never automatic.
- Coordinates entered by hand are respected and never overwritten by the
  place name.
- **The working atlas now shows every located entry**, so a place you typed
  appears at once; entries not yet cleared for publication are drawn faintly
  and listed as held back. Every export stays strict: only published entries
  with a publishable place travel, exactly as before.

## 1.4.2 (2026-06-11)

- Releases are archived on [Zenodo](https://zenodo.org) from this version
  onward, each minting a DOI, so the register can be cited the way it asks
  others to cite. The concept DOI
  [10.5281/zenodo.20651020](https://doi.org/10.5281/zenodo.20651020) always
  resolves to the latest version.
- Housekeeping for the public record: this CHANGELOG, the archive metadata,
  and the repository's homepage link to the live copy.

## 1.4.1 (2026-06-11)

- The loss-event field on the cataloguer's desk can now name a new event in
  place, creating and assigning it without a trip to the Timeline folio.
- The register's batch bar offers the same when no events exist yet: name
  one and assign it to every selected entry in one stroke, the
  forty-entries-from-one-fire moment after an import.

## 1.4.0 (2026-06-11)

The register learns who remembers, and guards them.

- **Sources and narrators**: a project-level register of the people the
  work rests on. Each carries a publication alias; identities, contact, and
  consent notes never leave the working file. Evidence and sightings link
  to their narrator, the notice credits the alias, and one view gathers
  everything that rests on a person's word, with a single action to
  restrict all of their public material when consent shifts.
- **Sightings and reports**: dated entries in each record's dossier
  ("offered for sale, 1977"), each marked as supporting or complicating the
  stated status, so the register can hold contradiction without resolving
  it away.
- **Status history**: a change of fate is succeeded, never overwritten. The
  notice shows what an entry was formerly, until when, and why it changed.
- **Investigation log**: dated working notes on the search itself,
  including the negative results. Kept out of every export.
- **Lock this register**: a passphrase encrypts the file at rest (the
  browser autosave, the live disk file, and saved project files) with
  AES-GCM under a PBKDF2-derived key, entirely in the browser. Exports are
  publications and stay plain by design.
- **Extent**: an optional count (1,140 glass plates) so collection-level
  entries can be counted in objects, and statistics can answer "how much
  was lost" the way a loss assessment must.
- **Register mark (siglum)**: each register sets its own prefix for entry
  numbers, the way manuscripts carry sigla.
- **Merge can keep both**: when the same number names two different works,
  the incoming entry joins under a fresh number; colliding event and source
  ids from the other register are renumbered with every reference
  following.
- **Notice for circulation**: any entry prints as a one-page appeal, with
  its image, when and where it was last seen, and whom to tell. The
  memorial notice mourns; this one asks.

## 1.3.0 (2026-06-10)

The register learns to end like a book and to work in the field.

- **Index folio**: alphabetical indexes of creators, tags, and places with
  dotted leaders, in the app and in the finding aid.
- **Print as a memorial book**: a cover leaf from the front matter, one
  notice per page, and the register and index as appendices, through the
  browser's print dialog.
- **Wayback snapshots**: one click asks the Internet Archive to save a
  piece of web evidence, and the archived address is kept beside the
  original.
- **Batch work on the register**: select rows and assign an event, add a
  tag, or set a status across all of them. Publication stays one entry at
  a time, deliberately.
- **Duplicate flagging**: after an import or merge, entries sharing a
  near-identical title and creator are quietly raised, with one-click
  relate, strike, or keep.
- **A live file on disk**: in Chromium browsers the project can save
  continuously to a chosen .json alongside the browser autosave, resumable
  next session.
- **Offline use**: after the first visit the whole tool works with no
  connection.

## 1.2.0 (2026-06-10)

The consent model deepens, and loss becomes a historical object.

- **Entry-level publication**: every entry starts held back; nothing enters
  an export until published, and the finding aid states how many entries
  are recorded but not published.
- **Embargo dates**: an embargo can carry a date; when it lapses, Lacuna
  points it out, and the consent state still changes only by hand.
- **Places publish in three states**: withheld (default), approximate
  (rounded to about 10 km), or exact.
- **Loss events**: first-class objects (a fire, a sale, a flood) kept on
  the new **Timeline folio**, where the chronology of disappearance runs
  year by year with the events set among the entries.
- **Relations**: typed links between entries (part of, contains, copy of,
  has copy, related to), one direction stored, the inverse computed.
- **CSV import**: an old inventory becomes draft entries, held back until
  published.
- **Project merge**: two registers reconcile with no server, conflicts laid
  out side by side.
- **Fixity checks**: evidence files verify against their recorded sha-256
  fingerprints, singly or as a folder.

## 1.1.0 (2026-06-10)

- **Strike, not delete**: a struck entry stays in the register as a
  cancelled line, ruled through, out of every export, restorable, its
  number never reused. A ledger cancels; it does not erase.

## 1.0.0 (2026-06-10)

First release: a local-first catalogue for archives that no longer exist.

- The **register** as a ruled ledger; each entry a **memorial notice** in a
  mourning frame, with the live cataloguer's desk beneath it.
- A controlled vocabulary of fates (destroyed, damaged, looted, dispersed,
  unlocated, survives in copy, survives in fragment) with certainty marks.
- **Evidence** with sha-256 fingerprints, thumbnails, rights, and consent
  states; restricted and embargoed material never exports.
- **Surviving copies** with IIIF deep zoom.
- **Statistics** with tally strokes; an **atlas** plotting only locations
  marked safe to publish.
- Exports: a self-contained **finding aid**, CSV, public JSON, and a
  citation for every entry in Chicago, MLA, APA, or BibTeX.
- Arabic and right-to-left support throughout; an entirely fictional
  sample archive, generated from scratch.
