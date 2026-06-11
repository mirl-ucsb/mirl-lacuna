#!/usr/bin/env python3
"""Generate the sample register that ships with MIRL Lacuna.

Everything here is invented: the town of Qamariyya, the Studio al-Qamar, its
people, and every loss recorded. The sample exists so the tool opens with a
worked example; it makes no claim about any real person, place, archive, or
event. The five evidence images are drawn from scratch with Pillow (flat,
sepia, plainly synthetic), and each record's sha-256 hashes are computed from
the exact files written, so the sample demonstrates evidential tethering with
true hashes.

    python3 make-samples.py

Writes img/*.png, sample-project.json (for reading), and sample-data.js
(loaded by the page so the sample works even from file://). Needs Pillow.
"""

import base64
import hashlib
import io
import json
import os
import random

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    raise SystemExit("This script needs Pillow: python3 -m pip install Pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "img")
os.makedirs(IMG, exist_ok=True)

R = random.Random(1923)  # the studio's founding year; keeps output deterministic

# a sepia print palette
PAPER = (236, 226, 205)
CREAM = (244, 237, 220)
DARK = (62, 48, 34)
MID = (122, 98, 70)
LIGHT = (196, 178, 148)
SHADOW = (88, 68, 48)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vgrad(d, box, top, bottom):
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        d.line([(x0, y), (x1, y)], fill=lerp(top, bottom, (y - y0) / max(1, y1 - y0)))


def print_border(img, margin=36):
    """Mount the drawing inside a cream print border, like an old contact print."""
    w, h = img.size
    out = Image.new("RGB", (w + 2 * margin, h + 2 * margin), CREAM)
    out.paste(img, (margin, margin))
    d = ImageDraw.Draw(out)
    d.rectangle([margin - 1, margin - 1, margin + w, margin + h], outline=MID, width=1)
    return out


def figure(d, x, base, height, dress):
    """A sitter as a dignified silhouette: no face, just presence."""
    head_r = height // 7
    d.polygon([(x - height // 4, base), (x + height // 4, base),
               (x + height // 9, base - height + head_r * 2),
               (x - height // 9, base - height + head_r * 2)], fill=dress)
    d.ellipse([x - head_r, base - height, x + head_r, base - height + 2 * head_r], fill=dress)


def make_portrait():
    """LAC-0001: copy print of the lost portrait of three sitters."""
    w, h = 1200, 880
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    vgrad(d, (0, 0, w, h), (214, 198, 168), (176, 154, 122))   # painted backdrop
    for _ in range(26):                                         # backdrop mottle
        bx, by = R.randint(0, w), R.randint(0, int(h * 0.7))
        br = R.randint(40, 130)
        d.ellipse([bx - br, by - br, bx + br, by + br],
                  fill=lerp((214, 198, 168), (176, 154, 122), R.random()))
    img = img.filter(ImageFilter.GaussianBlur(22))
    d = ImageDraw.Draw(img)
    d.rectangle([0, h - 170, w, h], fill=(118, 96, 70))         # floor
    d.line([(0, h - 170), (w, h - 170)], fill=SHADOW, width=3)
    # a potted palm, the studio's one prop
    px = 150
    d.rectangle([px - 36, h - 300, px + 36, h - 175], fill=(96, 76, 54))
    for ang in (-60, -30, 0, 30, 60):
        import math
        ex = px + int(150 * math.sin(math.radians(ang)))
        ey = h - 300 - int(130 * math.cos(math.radians(ang)) * 0.9)
        d.line([(px, h - 290), (ex, ey)], fill=(84, 78, 48), width=9)
    # the three daughters, eldest unsmiling at the centre
    figure(d, 560, h - 180, 470, (52, 40, 30))
    figure(d, 760, h - 180, 420, (70, 54, 38))
    figure(d, 390, h - 180, 380, (64, 50, 36))
    return print_border(img)


def make_inventory():
    """LAC-0002: a page of the 1931 inventory of the glass-plate cabinet."""
    w, h = 1050, 1360
    img = Image.new("RGB", (w, h), CREAM)
    d = ImageDraw.Draw(img)
    vgrad(d, (0, 0, w, 80), (222, 210, 184), CREAM)             # toned head edge
    d.line([(70, 130), (w - 70, 130)], fill=DARK, width=3)      # header rules
    d.line([(70, 138), (w - 70, 138)], fill=DARK, width=1)
    d.line([(170, 160), (170, h - 90)], fill=(168, 92, 74), width=2)   # margin rule
    d.line([(w - 220, 160), (w - 220, h - 90)], fill=(168, 92, 74), width=1)
    y = 200
    n = 0
    while y < h - 100:
        d.line([(70, y), (w - 70, y)], fill=(199, 184, 153), width=1)  # ruled line
        # a faux entry: number marks, then a written line, then a figure
        if n % 7 != 6:  # the cabinet's lines, with a blank now and then
            d.line([(92, y - 12), (118 + (n % 4) * 6, y - 12)], fill=MID, width=3)
            x = 190
            for _ in range(R.randint(4, 9)):                     # handwriting as strokes
                seg = R.randint(28, 92)
                yy = y - R.randint(10, 16)
                d.line([(x, yy), (x + seg, yy - R.randint(-3, 3))], fill=SHADOW, width=3)
                x += seg + R.randint(10, 22)
                if x > w - 320:
                    break
            d.line([(w - 190, y - 12), (w - 190 + R.randint(18, 40), y - 12)], fill=MID, width=3)
        y += 46
        n += 1
    return print_border(img, 30)


def make_self_portrait_copy():
    """LAC-0004: the library's contact print, the north-window room."""
    w, h = 1200, 880
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    vgrad(d, (0, 0, w, h - 200), (170, 152, 124), (140, 120, 94))      # wall
    d.rectangle([0, h - 200, w, h], fill=(110, 90, 66))                 # floor
    # the north window, light of the first room
    wx0, wy0, wx1, wy1 = 720, 90, 1100, 560
    d.rectangle([wx0 - 14, wy0 - 14, wx1 + 14, wy1 + 14], fill=(92, 74, 52))
    vgrad(d, (wx0, wy0, wx1, wy1), (238, 228, 204), (208, 192, 162))
    for fx in range(wx0, wx1, (wx1 - wx0) // 3):
        d.line([(fx, wy0), (fx, wy1)], fill=(92, 74, 52), width=8)
    d.line([(wx0, (wy0 + wy1) // 2), (wx1, (wy0 + wy1) // 2)], fill=(92, 74, 52), width=8)
    # window light falling on the floor
    d.polygon([(wx0 - 60, h - 200), (wx1 - 80, h - 200), (wx1 - 300, h - 40), (wx0 - 320, h - 40)],
              fill=(132, 110, 82))
    # the camera on its tripod, and the photographer present as a shadow
    cx, cy = 420, 420
    d.polygon([(cx, cy + 60), (cx - 90, h - 130), (cx - 60, h - 130), (cx + 8, cy + 90)], fill=(50, 40, 30))
    d.polygon([(cx, cy + 60), (cx + 90, h - 130), (cx + 60, h - 130), (cx - 8, cy + 90)], fill=(50, 40, 30))
    d.line([(cx, cy + 60), (cx, h - 150)], fill=(50, 40, 30), width=14)
    d.rectangle([cx - 70, cy - 30, cx + 70, cy + 70], fill=(44, 35, 26))            # the box
    d.ellipse([cx + 28, cy - 4, cx + 64, cy + 32], fill=(30, 24, 18), outline=(96, 80, 60), width=3)
    d.polygon([(cx - 70, cy - 30), (cx - 130, cy - 64), (cx - 130, cy + 20), (cx - 70, cy + 40)],
              fill=(36, 29, 22))                                                     # the cloth
    shadow = [(cx - 60, h - 120), (cx - 320, h - 60), (cx - 360, h - 28), (cx - 40, h - 95)]
    d.polygon(shadow, fill=(78, 62, 46))
    return print_border(img)


def make_harbour():
    """LAC-0007: the harbour at dusk, with the water damage it took in 1981."""
    w, h = 1380, 880
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    vgrad(d, (0, 0, w, 560), (216, 184, 138), (160, 122, 88))   # dusk sky
    d.ellipse([w // 2 - 70, 380, w // 2 + 70, 520], fill=(236, 214, 168))  # low sun
    vgrad(d, (0, 560, w, h), (96, 78, 58), (58, 46, 36))        # the sea
    d.line([(0, 560), (w, 560)], fill=(70, 56, 42), width=4)
    d.rectangle([0, 540, 260, 560], fill=(74, 58, 44))          # breakwater
    d.rectangle([250, 510, 270, 560], fill=(74, 58, 44))        # its light
    for bx, scale in ((430, 1.0), (820, 0.7), (1080, 0.5)):     # three boats
        bw, bh = int(150 * scale), int(34 * scale)
        by = 600 + int(90 * (1 - scale))
        d.polygon([(bx, by), (bx + bw, by), (bx + bw - 24, by + bh), (bx + 20, by + bh)], fill=(40, 32, 26))
        d.line([(bx + bw // 2, by), (bx + bw // 2, by - int(140 * scale))], fill=(40, 32, 26), width=max(3, int(7 * scale)))
        d.line([(bx + bw // 2, by - int(140 * scale)), (bx + bw - 10, by)], fill=(40, 32, 26), width=2)
    for _ in range(40):                                          # the water's glints
        gx, gy = R.randint(0, w), R.randint(580, h - 30)
        d.line([(gx, gy), (gx + R.randint(14, 50), gy)], fill=(150, 122, 92), width=2)
    # the damage: emulsion lifted along the lower third
    for _ in range(7):
        bx, by = R.randint(-60, w - 200), R.randint(h - 280, h - 60)
        bw_, bh_ = R.randint(180, 420), R.randint(70, 170)
        d.ellipse([bx, by, bx + bw_, by + bh_], fill=lerp(CREAM, (216, 200, 172), R.random()),
                  outline=(150, 120, 92), width=4)
    d.ellipse([-160, h - 240, 360, h + 120], fill=CREAM, outline=(150, 120, 92), width=5)
    return print_border(img)


def make_contact_sheet():
    """LAC-0008: the one surviving contact sheet of the street series, torn."""
    w, h = 1200, 880
    img = Image.new("RGB", (w, h), (52, 44, 36))
    d = ImageDraw.Draw(img)
    cols, rows = 5, 4
    fw, fh = 180, 150
    gx, gy = 38, 42
    x0 = (w - cols * fw - (cols - 1) * gx) // 2
    y0 = (h - rows * fh - (rows - 1) * gy) // 2
    kept = {(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 3), (2, 0), (2, 1), (3, 0), (3, 1), (3, 2)}
    for r_ in range(rows):
        for c in range(cols):
            x = x0 + c * (fw + gx)
            y = y0 + r_ * (fh + gy)
            if (r_, c) in kept:
                vgrad(d, (x, y, x + fw, y + fh), (190, 168, 134), (130, 108, 82))
                hy = y + R.randint(60, 100)                       # a street horizon
                d.rectangle([x, hy, x + fw, y + fh], fill=(96, 78, 58))
                for _ in range(R.randint(1, 3)):                  # passers-by
                    px_ = x + R.randint(16, fw - 24)
                    ph_ = R.randint(28, 44)
                    d.line([(px_, hy + 16), (px_, hy + 16 - ph_)], fill=(40, 32, 24), width=6)
                    d.ellipse([px_ - 5, hy + 8 - ph_, px_ + 5, hy + 18 - ph_], fill=(40, 32, 24))
                d.rectangle([x, y, x + fw, y + fh], outline=(30, 25, 20), width=3)
            else:
                d.rectangle([x, y, x + fw, y + fh], outline=(74, 62, 50), width=2)
            d.line([(x + 8, y + fh + 16), (x + 38, y + fh + 16)], fill=(120, 104, 84), width=3)
    # the torn-away corner
    tear = [(w, h), (w, h - 420), (w - 110, h - 360), (w - 60, h - 270),
            (w - 180, h - 200), (w - 120, h - 90), (w - 260, h)]
    d.polygon(tear, fill=CREAM)
    d.line(tear[1:], fill=(150, 130, 104), width=4)
    return print_border(img, 26)


# ---------------------------------------------------------------- the data

IMAGES = {
    "copy-portrait-daughters.png": make_portrait,
    "inventory-page.png": make_inventory,
    "copy-self-portrait.png": make_self_portrait_copy,
    "harbour-dusk.png": make_harbour,
    "contact-sheet-fragment.png": make_contact_sheet,
}

written = {}
for name, fn in IMAGES.items():
    path = os.path.join(IMG, name)
    fn().save(path, optimize=True)
    written[name] = path
    print("wrote", os.path.relpath(path, HERE))


def sha256_of(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def thumb_of(path):
    im = Image.open(path).convert("RGB")
    im.thumbnail((280, 280))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=72)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


_ev_n = [0]


def ev(evtype, label, name=None, url="", consent="public", rights="", note=""):
    """An evidence item; when a shipped image is named, hash and thumb it."""
    _ev_n[0] += 1
    e = {"id": "ev-%02d" % _ev_n[0], "type": evtype, "label": label, "file": None,
         "url": url, "sha256": "", "rights": rights, "consent": consent,
         "note": note, "thumb": ""}
    if name:
        path = written[name]
        e["file"] = {"name": name, "size": os.path.getsize(path), "type": "image/png"}
        e["sha256"] = sha256_of(path)
        e["thumb"] = thumb_of(path)
        e["url"] = "samples/img/" + name
        if not rights:
            e["rights"] = "sample illustration, plainly fictional"
    return e


_cp_n = [0]


def cp(institution, identifier="", iiif="", url="", note=""):
    _cp_n[0] += 1
    return {"id": "cp-%02d" % _cp_n[0], "institution": institution,
            "identifier": identifier, "iiif": iiif, "url": url, "note": note}


T = "2026-06-10T12:00:00.000Z"


def rec(n, **kw):
    base = {
        "id": "LAC-%04d" % n,
        "titles": [{"text": "", "lang": ""}],
        "creator": "", "date": "", "medium": "", "origin": "",
        "status": "unlocated", "certainty": "uncertain",
        "lastSeen": {"date": "", "place": "", "source": ""},
        "note": "", "tags": [],
        "eventId": None, "relations": [],
        "location": {"place": "", "lat": None, "lon": None, "publish": "withheld"},
        "evidence": [], "copies": [],
        "publish": True,   # the sample publishes its entries so the finding aid is full
        "struck": False,
        "created": T, "modified": T,
    }
    base.update(kw)
    return base


STUDIO = "Studio al-Qamar portrait files"

EVENTS = [
    {"id": "evt-1", "name": "The winter fire of 1976", "date": "February 1976",
     "place": "Qamariyya, the studio",
     "note": "A stove fire in the back room took the studio in a night. What was not "
             "burned stood unguarded in the courtyard for a week."},
    {"id": "evt-2", "name": "The sale and clearing of the shop", "date": "1977",
     "place": "Qamariyya",
     "note": "The fittings were sold, and scrap dealers cleared the street the same year."},
    {"id": "evt-3", "name": "The roof failure at the family house", "date": "1981",
     "place": "Qamariyya, the family house",
     "note": "Winter rain came through the stairwell where the exhibition prints hung."},
]

records = [
    rec(1,
        titles=[{"text": "Portrait of the harbourmaster's daughters", "lang": "en"},
                {"text": "بنات رئيس الميناء", "lang": "ar"}],
        creator="Wadiha Qamar", date="1934", medium="gelatin silver print", origin=STUDIO,
        status="destroyed", certainty="attested",
        lastSeen={"date": "February 1976", "place": "Qamariyya, the studio",
                  "source": "recalled by the studio's apprentice"},
        note=("Made in the studio's best year, by the photographer's own account. The sitting is "
              "remembered for the eldest daughter's refusal to smile, which Wadiha Qamar admired "
              "and printed large for the window display.\n\nThe display print and the negative "
              "burned together in the winter fire of 1976. A small copy print, made for the family "
              "in 1935, was photographed in 2019: the only image of the image."),
        tags=["portraits", "window display"],
        eventId="evt-1",
        evidence=[
            ev("photograph", "Copy print of 1935, photographed in 2019", name="copy-portrait-daughters.png",
               note="the family's copy, rephotographed"),
            ev("testimony", "Account of the studio's apprentice, recorded 2019", consent="restricted",
               note="held for the narrator; not for publication"),
        ]),

    rec(2,
        titles=[{"text": "The glass-plate cabinet, negatives 1923 to 1931", "lang": "en"}],
        creator="Wadiha Qamar", date="1923 to 1931", medium="gelatin dry plates, one oak cabinet",
        origin=STUDIO, status="destroyed", certainty="attested",
        lastSeen={"date": "February 1976", "place": "Qamariyya, the studio",
                  "source": "the 1931 inventory, and the apprentice's account"},
        note=("The studio's first decade stood in one oak cabinet: portrait negatives on glass, "
              "numbered 1 to 1,140 in the daybook. The cabinet stood nearest the stove, and nothing "
              "of it survived the winter fire of 1976.\n\nThe inventory page reproduced here was "
              "kept at the photographer's house and is the best record of what the cabinet held."),
        tags=["glass plates", "negatives"],
        eventId="evt-1",
        location={"place": "Qamariyya", "lat": 34.1, "lon": 35.9, "publish": "exact"},
        evidence=[
            ev("document", "Inventory of the plate cabinet, 1931, page 3", name="inventory-page.png",
               note="from the photographer's house papers"),
        ]),

    rec(3,
        titles=[{"text": "Wedding album of the Nahhal family", "lang": "en"}],
        creator="Studio al-Qamar", date="1951", medium="album of 40 mounted prints", origin=STUDIO,
        status="looted", certainty="probable",
        lastSeen={"date": "March 1976", "place": "Qamariyya, the studio courtyard",
                  "source": "a notice in the town paper"},
        note=("Assembled for the Nahhal family and awaiting collection when the fire came. In the "
              "week after, the salvaged stock stood unguarded in the courtyard, and the album was "
              "taken with the brass scales and the till. A neighbour's notice in the town paper "
              "asked for its return. Nothing came of it.\n\nThe family asked that this entry "
              "stay out of the published register for now; it is held back, catalogued and counted."),
        tags=["albums", "weddings"],
        eventId="evt-1", publish=False,
        location={"place": "last offered for sale inland", "lat": 34.4, "lon": 36.2, "publish": "withheld"},
        evidence=[
            ev("citation", "Notice in the Qamariyya town paper, March 1976",
               note="transcribed from the family's clipping; the clipping itself is with them"),
        ]),

    rec(4,
        titles=[{"text": "Self-portrait with the north window", "lang": "en"}],
        creator="Wadiha Qamar", date="1929", medium="gelatin dry plate", origin=STUDIO,
        status="copy", certainty="attested",
        lastSeen={"date": "1944", "place": "Qamariyya, the studio", "source": "the daybook"},
        note=("The plate cracked in 1944 and was discarded, but the municipal library's album "
              "holds a contact print pasted in by the librarian, who collected the studio's work. "
              "The copy is the only surviving image of the studio's first north-window room."),
        tags=["self-portraits", "the first room"],
        relations=[{"type": "part-of", "target": "LAC-0002"}],
        evidence=[
            ev("photograph", "The library's contact print (scan)", name="copy-self-portrait.png",
               note="scan of album QL-12, leaf 9"),
        ],
        copies=[
            cp("Qamariyya Municipal Library", "album QL-12, leaf 9",
               url="samples/img/copy-self-portrait.png",
               note="a contact print from the lost plate; the Look button opens the scan"),
        ]),

    rec(5,
        titles=[{"text": "Studio daybook, 1947 to 1953", "lang": "en"}],
        creator="Studio al-Qamar", date="1947 to 1953", medium="ledger volume", origin=STUDIO,
        status="dispersed", certainty="probable",
        lastSeen={"date": "1977", "place": "Qamariyya, sold with the shop fittings",
                  "source": "the family's account of the sale"},
        note=("Sold with the shop fittings in 1977, then broken up for its pages, which carry "
              "sitters' names and plate numbers in a fine commercial hand. Three runs of pages are "
              "known: two in collections, one in a dealer's stock. The rest is unaccounted for."),
        tags=["ledgers", "daybooks"],
        eventId="evt-2",
        copies=[
            cp("Bayt al-Suwar collection", "leaves 12 to 31", note="acquired 1989"),
            cp("a private collection abroad", "leaves 44 to 60", note="seen and listed in 2003"),
        ]),

    rec(6,
        titles=[{"text": "Negatives of the flood of February 1957", "lang": "en"}],
        creator="Wadiha Qamar", date="1957", medium="35 mm negatives, three envelopes", origin=STUDIO,
        status="unlocated", certainty="uncertain",
        lastSeen={"date": "1957", "place": "Qamariyya, the public works office",
                  "source": "a receipt copied into the daybook"},
        note=("The studio photographed the flood for the municipality, street by street. The "
              "envelopes were deposited with the public works office and never returned. They may "
              "sit uncatalogued in the municipal deposit, which has no reading room and no list."),
        tags=["floods", "negatives", "municipal work"],
        location={"place": "Qamariyya, municipal deposit", "lat": None, "lon": None, "publish": "withheld"}),

    rec(7,
        titles=[{"text": "مشهد الميناء عند الغروب", "lang": "ar"},
                {"text": "The harbour at dusk", "lang": "en"}],
        creator="Wadiha Qamar", date="1938", medium="exhibition print, toned", origin=STUDIO,
        status="damaged", certainty="attested",
        lastSeen={"date": "1981", "place": "Qamariyya, the family house",
                  "source": "the family, who keep the print"},
        note=("The exhibition print hung in the stairwell of the family house and took water when "
              "the roof failed in 1981. The emulsion lifted along the lower third. What remains is "
              "stable, but the foreground figures are gone."),
        tags=["harbour", "exhibition prints"],
        eventId="evt-3",
        location={"place": "Qamariyya, the family house", "lat": 34.18, "lon": 35.97, "publish": "approximate"},
        evidence=[
            ev("photograph", "The print after the water damage", name="harbour-dusk.png",
               note="photographed in the family house, 2019"),
        ]),

    rec(8,
        titles=[{"text": "Contact sheets of the street series", "lang": "en"}],
        creator="Fuad Qamar", date="1964 to 1969", medium="contact sheets", origin=STUDIO,
        status="fragment", certainty="attested",
        lastSeen={"date": "1976", "place": "Qamariyya, the studio", "source": "the surviving sheet"},
        note=("The photographer's son walked the town with a small camera for five years. Of the "
              "street series, the daybook counts some two hundred frames; one torn sheet survives, "
              "eleven frames, found behind the forced cabinet."),
        tags=["street", "contact sheets"],
        eventId="evt-1",
        evidence=[
            ev("photograph", "The surviving contact sheet (scan)", name="contact-sheet-fragment.png",
               note="torn at the right edge when the cabinet was forced"),
        ]),

    rec(9,
        titles=[{"text": "Portrait ledger of sitters' names, volume 2", "lang": "en"}],
        creator="Studio al-Qamar", date="1954 to 1968", medium="ledger volume", origin=STUDIO,
        status="looted", certainty="uncertain",
        lastSeen={"date": "1977", "place": "Qamariyya", "source": "an account held under embargo"},
        note=("The volume listing sitters by name was in the shop when it was emptied. A person "
              "who saw it afterwards has given an account on condition that it stay closed until "
              "they say otherwise. The account is held embargoed; the entry stands on it."),
        tags=["ledgers", "sitters"],
        eventId="evt-2",
        evidence=[
            ev("testimony", "Account concerning the ledger, recorded 2021", consent="embargoed",
               note="closed at the narrator's request"),
        ]),

    rec(10,
        titles=[{"text": "The shopfront sign", "lang": "en"},
                {"text": "لافتة ستوديو القمر", "lang": "ar"}],
        creator="a Qamariyya sign painter", date="about 1946", medium="painted tin", origin=STUDIO,
        status="destroyed", certainty="probable",
        lastSeen={"date": "1975", "place": "Qamariyya, over the shop door",
                  "source": "the last photograph of the street"},
        note=("Painted tin, a crescent and the studio's name in two scripts. Last photographed in "
              "place in 1975. Scrap dealers cleared the street in 1977, and the sign is presumed "
              "to have gone with the rest."),
        tags=["signage", "the shopfront"],
        eventId="evt-2"),

    rec(11,
        titles=[{"text": "Print stock and frames, the back room", "lang": "en"}],
        creator="Studio al-Qamar", date="to 1976", medium="prints, frames, papers", origin=STUDIO,
        status="dispersed", certainty="uncertain",
        lastSeen={"date": "1977", "place": "Qamariyya", "source": "the daybook's last mention"},
        note="Known only from a mention in the daybook at the sale of the fittings. Nothing else attests it.",
        tags=["the back room"],
        eventId="evt-2"),

    rec(12,
        titles=[{"text": "Album of the citrus harvest at Tal Maja", "lang": "en"},
                {"text": "ألبوم قطاف الحمضيات", "lang": "ar"}],
        creator="Wadiha Qamar", date="1944", medium="album of 24 prints", origin=STUDIO,
        status="copy", certainty="attested",
        lastSeen={"date": "1976", "place": "Qamariyya, the studio", "source": "the daybook"},
        note=("Commissioned by the village association for its anniversary, in two copies. The "
              "studio's file copy burned in 1976; the association's copy survives in the village, "
              "rebound in the 1990s."),
        tags=["albums", "villages", "harvests"],
        eventId="evt-1",
        location={"place": "Tal Maja", "lat": 33.8, "lon": 36.4, "publish": "exact"},
        copies=[
            cp("Tal Maja village association", "the anniversary copy", note="rebound; pages complete"),
        ]),

    rec(13,
        titles=[{"text": "Studio daybook, 1947 to 1953 (entered twice)", "lang": "en"}],
        creator="Studio al-Qamar", date="1947 to 1953", medium="ledger volume", origin=STUDIO,
        status="dispersed", certainty="probable",
        note=("Entered a second time by mistake; the daybook is recorded at entry LAC-0005. "
              "Struck rather than erased, in the ledger's manner, so the numbering stands."),
        tags=["ledgers", "daybooks"],
        eventId="evt-2", publish=False,
        relations=[{"type": "related", "target": "LAC-0005"}],
        struck=True),
]

project = {
    "title": "Register of the Studio al-Qamar archive",
    "subtitle": "a worked example, entirely fictional",
    "compiler": "the sample cataloguer",
    "institution": "MIRL Lacuna sample data",
    "contact": "",
    "events": EVENTS,
    "note": ("Everything in this register is invented: the town of Qamariyya, the Studio al-Qamar, "
             "its people, and every loss recorded here. It exists to show how MIRL Lacuna works. "
             "Any resemblance to real people, places, archives, or events is coincidental."),
    "created": T,
    "modified": T,
}

data = {"format": "mirl-lacuna", "version": 1, "project": project, "records": records}

with open(os.path.join(HERE, "sample-project.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("wrote sample-project.json")

js = ("/* sample-data.js: the fictional sample register, generated by\n"
      "   samples/make-samples.py. Loaded as a script so the sample opens\n"
      "   even from file://, where fetch() cannot read local JSON. */\n"
      "window.LC = window.LC || {};\n"
      "LC.SAMPLE = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
with open(os.path.join(HERE, "sample-data.js"), "w", encoding="utf-8") as f:
    f.write(js)
print("wrote sample-data.js")
