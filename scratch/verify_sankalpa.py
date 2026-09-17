#!/usr/bin/env python
"""Verify the Hotel Sankalpa menu: every item has its own real image, prices and
names match the spec exactly, and no two dishes in a category share a photo."""
import json, os, re, hashlib, collections, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(os.path.join(ROOT, "scratch/sankalpa_spec.json"), encoding="utf-8"))
menu_ts = open(os.path.join(ROOT, "src/data/hotelSankalpaMenu.ts"), encoding="utf-8").read()
imgs_ts = open(os.path.join(ROOT, "src/data/sankalpaMenuImages.ts"), encoding="utf-8").read()
page_ts = open(os.path.join(ROOT, "src/components/HotelSankalpaMenuPage.tsx"), encoding="utf-8").read()

fail = []

# --- 1. image map covers every item, paths exist on disk ---
mapping = dict(re.findall(r"^\s*'((?:[^'\\]|\\.)*)':\s*'(/images/menu/[^']+)',", imgs_ts, re.M))
spec_items = [(c["title"], c["folder"], it) for c in spec["categories"] for it in c["items"]]
print(f"menu items in spec ......... {len(spec_items)}")
print(f"entries in image map ....... {len(mapping)}")

by_cat_hash = collections.defaultdict(lambda: collections.defaultdict(list))
all_hash = {}
missing, unreadable = [], []
for title, folder, it in spec_items:
    name = it["name"].replace("\\'", "'")
    key = it["name"]
    if key not in mapping:
        fail.append(f"no image mapped for {name!r}")
        continue
    rel = mapping[key]
    disk = os.path.join(ROOT, "public", rel.lstrip("/").replace("/", os.sep))
    if not os.path.isfile(disk):
        missing.append(f"{title} / {name} -> {rel}")
        continue
    data = open(disk, "rb").read()
    if len(data) < 2000:
        unreadable.append(f"{name} -> {rel} ({len(data)} bytes)")
    h = hashlib.md5(data).hexdigest()
    by_cat_hash[title][h].append(name)
    all_hash.setdefault(h, []).append(f"{title}/{name}")

print(f"images present on disk ..... {len(spec_items) - len(missing)}/{len(spec_items)}")
if missing:
    fail.append(f"{len(missing)} images missing from disk")
    for m in missing[:12]:
        print("   MISSING:", m)
    if len(missing) > 12:
        print(f"   ... and {len(missing)-12} more")
if unreadable:
    fail.append(f"{len(unreadable)} suspiciously tiny image files")
    for u in unreadable:
        print("   TINY:", u)

# --- 2. no repeated photo inside one category ---
print("\nper-category duplicate check:")
for title, hashes in by_cat_hash.items():
    dups = [v for v in hashes.values() if len(v) > 1]
    n = sum(len(v) for v in hashes.values())
    if dups:
        fail.append(f"duplicate photos inside {title}: {dups}")
        print(f"  {title:26s} {n:3d} items -> DUPLICATES {dups}")
    else:
        print(f"  {title:26s} {n:3d} items -> all distinct")

cross = {h: v for h, v in all_hash.items() if len(v) > 1}
print(f"\nphotos reused across categories: {len(cross)}")
for h, v in list(cross.items())[:10]:
    print("   ", v)

# --- 3. names and prices untouched ---
price_pairs = re.findall(r"name:\s*'((?:[^'\\]|\\.)*)',\s*\n\s*price:\s*(\d+),", menu_ts)
print(f"\nname/price pairs in menu data: {len(price_pairs)}")
spec_pairs = [(it["name"], it["price"]) for _, _, it in spec_items]
got = [(n.replace("\\'", "'"), int(p)) for n, p in price_pairs]
want = [(n, p) for n, p in spec_pairs]
if got != want:
    fail.append("menu names/prices do not match the spec exactly")
    for g, w in zip(got, want):
        if g != w:
            print(f"   MISMATCH got={g} want={w}")
else:
    print("   every name and price matches the requested menu exactly")

# --- 4. category structure ---
titles = re.findall(r"title:\s*'([^']+)'", menu_ts)
want_titles = [c["title"] for c in spec["categories"]]
print(f"\ncategories: {len(titles)} -> {titles}")
if titles != want_titles:
    fail.append(f"category list changed: {titles} != {want_titles}")

# --- 5. rendering requirements in the page component ---
checks = {
    "object-cover on dish image": "object-cover" in page_ts,
    "rounded corners on image": "rounded-2xl overflow-hidden" in page_ts,
    "lazy loading": 'loading="lazy"' in page_ts,
    "alt text uses item name": "alt={item.name}" in page_ts,
    "broken-image fallback": "onError" in page_ts,
    "responsive grid": "grid-cols-1 sm:grid-cols-2" in page_ts,
    "ADD button retained": ">ADD<" in page_ts or "ADD\n" in page_ts or "ADD " in page_ts,
    "quantity stepper retained": "updateQuantity(itemId" in page_ts,
}
print("\nrendering requirements:")
for k, v in checks.items():
    print(f"  [{'x' if v else ' '}] {k}")
    if not v:
        fail.append(f"page missing: {k}")

print("\n" + ("=" * 60))
if fail:
    print("FAILED CHECKS:")
    for f in fail:
        print("  -", f)
    sys.exit(1)
print("ALL CHECKS PASS")
