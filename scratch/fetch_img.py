#!/usr/bin/env python
"""Download a Pexels photo by ID, save a preview JPG for visual check,
and (with --commit) write the final webp into public/menu/<slug>.webp"""
import sys, os, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREVIEW_DIR = os.path.join(ROOT, "scratch", "menuwork")
OUT_DIR = os.path.join(ROOT, "public", "menu")

def src(pid, w):
    return f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w={w}"

def grab(pid, w=1400):
    req = urllib.request.Request(src(pid, w), headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def main():
    if len(sys.argv) < 3:
        print("usage: fetch_img.py <pexelsId> <slug> [--commit]"); sys.exit(1)
    pid, slug = sys.argv[1], sys.argv[2]
    commit = "--commit" in sys.argv
    os.makedirs(PREVIEW_DIR, exist_ok=True); os.makedirs(OUT_DIR, exist_ok=True)
    raw = grab(pid)
    tmp = os.path.join(PREVIEW_DIR, f"{slug}.src.jpg")
    open(tmp, "wb").write(raw)
    im = Image.open(tmp).convert("RGB")
    prev = os.path.join(PREVIEW_DIR, f"{slug}.preview.jpg")
    p = im.copy(); p.thumbnail((640, 640)); p.save(prev, "JPEG", quality=80)
    print(f"downloaded id={pid} slug={slug} size={im.size} preview={prev}")
    if commit:
        o = im.copy()
        if o.width > 1200:
            o = o.resize((1200, round(o.height * 1200 / o.width)), Image.LANCZOS)
        out = os.path.join(OUT_DIR, f"{slug}.webp")
        o.save(out, "WEBP", quality=82, method=6)
        print(f"COMMITTED {out} ({os.path.getsize(out)//1024} KB)")

main()
