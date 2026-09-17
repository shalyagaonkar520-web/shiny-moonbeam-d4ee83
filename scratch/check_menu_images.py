#!/usr/bin/env python
"""Health check for every dish photo used by the four hotel menus.

Run this after any change to menu imagery:
    python scratch/check_menu_images.py

Checks:
  1. every image referenced by a menu actually exists and decodes
  2. no two dishes within the same hotel show the identical photo
  3. no image matches a known-unusable stock photo (blocklist below)

The blocklist exists because Pexels 25440738 is titled "Mushrooms, Meat and Sauces
on Black Plate". It looks like a plain mushroom dish and was picked three separate
times for vegetarian menu items before this check was added.
"""
import json, os, io, sys, hashlib, collections, urllib.request
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

BLOCKLIST = {
    25440738: 'titled "Mushrooms, Meat and Sauces on Black Plate" - contains meat',
}


def fetch(pid, w=1200):
    url = (f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg"
           f"?auto=compress&cs=tinysrgb&w={w}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read())).convert("RGB")


def cover(im, w=800, h=600):
    t = w / h
    W, H = im.size
    if W / H > t:
        nw = int(H * t); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
    else:
        nh = int(W / t); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
    return im.resize((w, h), Image.LANCZOS)


def sig(im):
    a = np.asarray(im.convert("L").resize((32, 32)), dtype=float)
    return (a > a.mean()).astype(int)


rows = json.load(open("scratch/audit_manifest.json", encoding="utf-8"))
problems = []

# 1. exist + decode
H = {}
for r in rows:
    p = r["path"]
    if p in H:
        continue
    if not os.path.isfile(p):
        problems.append(f"missing file: {p}"); continue
    try:
        Image.open(p).verify(); Image.open(p).load()
        H[p] = hashlib.md5(open(p, "rb").read()).hexdigest()
    except Exception as e:
        problems.append(f"corrupt: {p} ({e})")
print(f"referenced images : {len({r['path'] for r in rows})}")
print(f"decode OK         : {len(H)}")

# 2. within-hotel duplicates
print()
for hotel in sorted({r["hotel"] for r in rows}):
    items = [r for r in rows if r["hotel"] == hotel]
    byh = collections.defaultdict(list)
    for r in items:
        if r["path"] in H:
            byh[H[r["path"]]].append(r["dish"])
    dups = [v for v in byh.values() if len(v) > 1]
    if dups:
        problems.append(f"{hotel}: same photo on {dups}")
    print(f"  {hotel:16s} {len(items):4d} dishes / {len(byh):4d} distinct photos"
          f"{'   DUPLICATE ' + str(dups) if dups else ''}")

# 2b. near-duplicates within a hotel (different bytes, same photograph)
# Paneer Crispy once got a slightly different crop of the Paneer 65 photo, which the
# md5 check above cannot see. Compare a perceptual signature instead.
print()
for hotel in sorted({r["hotel"] for r in rows}):
    paths = sorted({r["path"] for r in rows if r["hotel"] == hotel and r["path"] in H})
    sigs = {}
    for p_ in paths:
        try:
            sigs[p_] = sig(Image.open(p_))
        except Exception:
            pass
    near = []
    keys = list(sigs)
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            if (sigs[keys[i]] == sigs[keys[j]]).mean() > 0.92:
                near.append((os.path.basename(keys[i]), os.path.basename(keys[j])))
    if near:
        problems.append(f"{hotel}: near-duplicate photos {near}")
    print(f"  {hotel:16s} near-duplicate pairs: {near if near else 'none'}")

# 3. blocklist
print()
for pid, why in BLOCKLIST.items():
    try:
        ref = sig(cover(fetch(pid)))
    except Exception as e:
        print(f"  (could not fetch blocklisted {pid}: {e})"); continue
    hits = []
    for p in sorted(H):
        try:
            if (ref == sig(Image.open(p))).mean() > 0.92:
                hits.append(p)
        except Exception:
            pass
    if hits:
        problems.append(f"blocklisted photo {pid} ({why}) in use: {hits}")
    print(f"  blocklist {pid}: {'IN USE -> ' + str(hits) if hits else 'not used'}")

print("\n" + "=" * 60)
if problems:
    print("PROBLEMS:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("ALL MENU IMAGE CHECKS PASS")
