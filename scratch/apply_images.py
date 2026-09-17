#!/usr/bin/env python
"""Rewrite the `image` field of every menu item in the three hotel data files
so it points at the verified photo in /public/menu/<slug>.webp.

Matching is by dish name within each file. In all three files the `name` key
always precedes the `image` key inside an item object, so a small state machine
is enough and we avoid a brittle whole-file regex.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPPING = json.load(open(os.path.join(ROOT, "scratch", "mapping.json"), encoding="utf-8"))

FILES = {
    "mumtaz":  "src/data/hotelMumtazMenu.ts",
    "coastal": "src/data/hotelCoastalCrownMenu.ts",
    "malabar": "src/data/hotelMalabarMenu.ts",
}

NAME_RE  = re.compile(r'^(\s*)"?name"?\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$')
IMAGE_RE = re.compile(r'^(\s*)"?image"?\s*:\s*"[^"]*"(\s*,?)\s*$')

apply_changes = "--write" in sys.argv
problems, total = [], 0

for hotel, rel in FILES.items():
    path = os.path.join(ROOT, rel)
    lines = open(path, encoding="utf-8").read().split("\n")
    table = MAPPING[hotel]
    seen, pending, changed = set(), None, 0

    for i, line in enumerate(lines):
        m = NAME_RE.match(line)
        if m:
            dish = m.group(2)
            if dish in table:
                pending = (dish, table[dish])
                seen.add(dish)
            else:
                pending = None
                problems.append(f"{hotel}: dish present in file but NOT in mapping -> {dish!r}")
            continue
        if pending:
            mi = IMAGE_RE.match(line)
            if mi:
                indent, comma = mi.group(1), mi.group(2)
                quoted = '"image"' if '"image"' in line else "image"
                lines[i] = f'{indent}{quoted}: "/menu/{pending[1]}.webp"{comma}'
                changed += 1
                pending = None

    missing = set(table) - seen
    for d in sorted(missing):
        problems.append(f"{hotel}: mapped dish NOT found in file -> {d!r}")
    if changed != len(table):
        problems.append(f"{hotel}: replaced {changed} image lines but mapping has {len(table)}")

    total += changed
    print(f"{hotel:8s} {changed:3d} image paths rewritten  ({rel})")

    if apply_changes:
        open(path, "w", encoding="utf-8").write("\n".join(lines))

print(f"\ntotal image paths rewritten: {total}")
if problems:
    print("\nPROBLEMS:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("no problems: every dish matched exactly one image line")
if not apply_changes:
    print("\n(dry run - pass --write to save)")
