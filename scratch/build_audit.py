#!/usr/bin/env python
"""Build one audit checklist covering every dish photo used by all four hotels.
Source of truth is the menu data files themselves, so the list cannot drift."""
import json, os, re, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FILES = [
    ("Hotel Mumtaz",        "src/data/hotelMumtazMenu.ts"),
    ("Coastal Crown",       "src/data/hotelCoastalCrownMenu.ts"),
    ("Hotel Malabar",       "src/data/hotelMalabarMenu.ts"),
]

rows = []

# --- the three webp hotels: parse name / image / isVeg out of the TS ---
ITEM_RE = re.compile(
    r'"?name"?\s*:\s*"((?:[^"\\]|\\.)*)"'          # name
    r'.*?"?image"?\s*:\s*"([^"]+)"'                 # image
    r'(?:.*?"?isVeg"?\s*:\s*(true|false))?'         # optional isVeg
    , re.S)
CAT_RE = re.compile(r'"?title"?\s*:\s*"([^"]+)"')

for hotel, rel in FILES:
    text = open(os.path.join(ROOT, rel), encoding="utf-8").read()
    # split on category titles so each item knows its category
    parts = CAT_RE.split(text)
    # parts = [pre, title1, body1, title2, body2, ...]
    for i in range(1, len(parts), 2):
        cat, body = parts[i], parts[i + 1]
        for m in ITEM_RE.finditer(body):
            name, img, isveg = m.group(1), m.group(2), m.group(3)
            veg = (isveg == "true")
            # Mumtaz file has no isVeg; infer from its category
            if isveg is None:
                veg = "Veg" in cat
            rows.append({
                "hotel": hotel, "category": cat, "dish": name,
                "image": img, "isVeg": veg,
                "path": "public" + img,
            })

# --- Sankalpa: everything is vegetarian ---
spec = json.load(open(os.path.join(ROOT, "scratch/sankalpa_spec.json"), encoding="utf-8"))
for c in spec["categories"]:
    for it in c["items"]:
        img = f"/images/menu/{c['folder']}/{it['slug']}.jpg"
        rows.append({
            "hotel": "Hotel Sankalpa", "category": c["title"], "dish": it["name"],
            "image": img, "isVeg": True, "path": "public" + img,
            "expected": it["shows"],
        })

missing = [r for r in rows if not os.path.isfile(os.path.join(ROOT, r["path"].replace("/", os.sep)))]
by_hotel = collections.Counter(r["hotel"] for r in rows)
uniq_files = {r["path"] for r in rows}

json.dump(rows, open(os.path.join(ROOT, "scratch/audit_manifest.json"), "w", encoding="utf-8"),
          indent=2, ensure_ascii=False)

for h, n in by_hotel.items():
    veg = sum(1 for r in rows if r["hotel"] == h and r["isVeg"])
    print(f"{h:16s} {n:4d} dishes   ({veg} veg / {n-veg} non-veg)")
print(f"\ntotal dish entries : {len(rows)}")
print(f"distinct image files: {len(uniq_files)}")
print(f"missing files      : {missing if missing else 'none'}")
