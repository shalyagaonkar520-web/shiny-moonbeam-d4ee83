#!/usr/bin/env python
"""Download a Pexels photo, save a preview for visual checking, and with --commit
write the final JPG to public/images/menu/<folder>/<slug>.jpg

usage:
  python scratch/fetch_sankalpa.py <pexelsId> <folder> <slug>            # preview only
  python scratch/fetch_sankalpa.py <pexelsId> <folder> <slug> --commit   # save for real
"""
import sys, os, io, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW_DIR = os.path.join(ROOT, "scratch", "sankalpawork")
OUT_ROOT = os.path.join(ROOT, "public", "images", "menu")

# Menu cards render a square-ish thumbnail, so store a 4:3 landscape crop at a
# size that stays crisp on retina without bloating the page weight.
TARGET_W, TARGET_H = 800, 600


def fetch(pid, w=1200):
    url = (f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg"
           f"?auto=compress&cs=tinysrgb&w={w}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def cover_crop(im, w, h):
    """Centre-crop to exactly w x h, mirroring CSS object-fit: cover."""
    src_ratio, dst_ratio = im.width / im.height, w / h
    if src_ratio > dst_ratio:
        new_w = int(im.height * dst_ratio)
        box = ((im.width - new_w) // 2, 0, (im.width - new_w) // 2 + new_w, im.height)
    else:
        new_h = int(im.width / dst_ratio)
        box = (0, (im.height - new_h) // 2, im.width, (im.height - new_h) // 2 + new_h)
    return im.crop(box).resize((w, h), Image.LANCZOS)


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    pid, folder, slug = sys.argv[1], sys.argv[2], sys.argv[3]
    commit = "--commit" in sys.argv
    os.makedirs(PREVIEW_DIR, exist_ok=True)

    im = Image.open(io.BytesIO(fetch(pid))).convert("RGB")
    prev = os.path.join(PREVIEW_DIR, f"{slug}.preview.jpg")
    p = im.copy()
    p.thumbnail((640, 640))
    p.save(prev, "JPEG", quality=80)
    print(f"downloaded id={pid} {folder}/{slug} src={im.size} preview={prev}")

    if commit:
        out_dir = os.path.join(OUT_ROOT, folder)
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, f"{slug}.jpg")
        cover_crop(im, TARGET_W, TARGET_H).save(out, "JPEG", quality=82, optimize=True)
        print(f"COMMITTED /images/menu/{folder}/{slug}.jpg "
              f"({os.path.getsize(out)//1024} KB, {TARGET_W}x{TARGET_H})")


main()
