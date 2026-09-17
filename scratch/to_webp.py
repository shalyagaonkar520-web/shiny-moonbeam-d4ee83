#!/usr/bin/env python
"""Convert the heavy loose PNG/JPG images in public/ to WebP and repoint every
source reference at the new filename.

These are 1024x1024 PNGs weighing ~850 KB each that render in cards a few hundred
pixels wide. As WebP they keep the same pixel dimensions but cost a fraction of the
bytes, which is what actually makes the app feel slow on a phone.

Run with --write to apply; without it, prints what would change.
"""
import os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
WRITE = "--write" in sys.argv

# Files the PWA manifest / html / service worker reference by exact name.
KEEP_AS_IS = {"logo.png", "pwa-icon-192.png", "pwa-icon-512.png", "favicon.ico",
              "apple-touch-icon.png", "og-image.png", "og-image.jpg"}

SRC_EXTS = (".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".html")


def source_files():
    out = []
    for base in ("src",):
        for root, _, fs in os.walk(os.path.join(ROOT, base)):
            for f in fs:
                if f.endswith(SRC_EXTS):
                    out.append(os.path.join(root, f))
    for extra in ("index.html",):
        p = os.path.join(ROOT, extra)
        if os.path.isfile(p):
            out.append(p)
    return out


files = source_files()
blob = "\n".join(open(f, encoding="utf-8", errors="ignore").read() for f in files)

candidates, unreferenced = [], []
for f in sorted(os.listdir(PUBLIC)):
    if not f.lower().endswith((".png", ".jpg", ".jpeg")):
        continue
    if f in KEEP_AS_IS:
        continue
    (candidates if f in blob else unreferenced).append(f)

converted, saved_before, saved_after = [], 0, 0
for f in candidates:
    src = os.path.join(PUBLIC, f)
    stem = os.path.splitext(f)[0]
    dst = os.path.join(PUBLIC, stem + ".webp")
    before = os.path.getsize(src)
    if WRITE:
        im = Image.open(src).convert("RGB")
        # Keep the pixel dimensions; these are already sensible (mostly 1024px).
        # Only pull in anything absurdly large.
        if max(im.size) > 1600:
            im.thumbnail((1600, 1600), Image.LANCZOS)
        im.save(dst, "WEBP", quality=86, method=6)
        after = os.path.getsize(dst)
        os.remove(src)
    else:
        after = 0
    converted.append((f, stem + ".webp", before, after))
    saved_before += before
    saved_after += after

# Repoint references
if WRITE:
    rename = {"/" + a: "/" + b for a, b, _, _ in converted}
    changed = 0
    for path in files:
        txt = open(path, encoding="utf-8").read()
        new = txt
        for old, nw in rename.items():
            # only match the exact path inside quotes
            new = re.sub(r'(?<=["\'\(])' + re.escape(old) + r'(?=["\'\)])', nw, new)
        if new != txt:
            open(path, "w", encoding="utf-8", newline="\n").write(new)
            changed += 1
    for f in unreferenced:
        os.remove(os.path.join(PUBLIC, f))
    print(f"source files updated : {changed}")
    print(f"unreferenced removed : {len(unreferenced)}")

print(f"images converted     : {len(converted)}")
print(f"before               : {saved_before/1e6:.1f} MB")
if WRITE:
    print(f"after                : {saved_after/1e6:.1f} MB")
    print(f"saved                : {(saved_before-saved_after)/1e6:.1f} MB")
else:
    print(f"unreferenced to drop : {len(unreferenced)} files "
          f"({sum(os.path.getsize(os.path.join(PUBLIC,f)) for f in unreferenced)/1e6:.1f} MB)")
    print("\n(dry run - pass --write to apply)")
