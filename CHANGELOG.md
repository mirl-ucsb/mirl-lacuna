# Changelog

MIRL Lacuna keeps its history the way it asks registers to keep theirs:
nothing erased, each change dated and explained. Versions follow
[semantic versioning](https://semver.org); project files from any earlier
version load cleanly in any later one.

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
