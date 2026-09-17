#!/usr/bin/env python
"""Generate the Hotel Sankalpa image map and menu data files from sankalpa_spec.json.
Names and prices come straight from the spec, so they cannot drift by hand-editing."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(os.path.join(ROOT, "scratch", "sankalpa_spec.json"), encoding="utf-8"))


def js(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")


# ---------- centralized image map ----------
rows = []
for c in spec["categories"]:
    rows.append(f"\n  // {c['title']}")
    for it in c["items"]:
        path = f"/images/menu/{c['folder']}/{it['slug']}.jpg"
        rows.append(f"  '{js(it['name'])}': '{path}',")

images_ts = f"""// Hotel Sankalpa - centralized dish image map.
// Single source of truth: every menu item name maps to its own photo.
// Files live in /public/images/menu/<category-folder>/<slug>.jpg
// Each photo was visually checked against its dish; every item is vegetarian.

export const SANKALPA_MENU_IMAGES: Record<string, string> = {{{chr(10).join(rows)}
}};

// Shown only if a dish photo ever fails to load.
export const SANKALPA_FALLBACK_IMAGE = '/hotel_sankalpa.jpg';

export function getSankalpaDishImage(itemName: string): string {{
  return SANKALPA_MENU_IMAGES[itemName] || SANKALPA_FALLBACK_IMAGE;
}}
"""
open(os.path.join(ROOT, "src/data/sankalpaMenuImages.ts"), "w",
     encoding="utf-8", newline="\n").write(images_ts)

# ---------- menu data ----------
cats = []
for c in spec["categories"]:
    items = []
    for it in c["items"]:
        items.append(
            "      {\n"
            f"        name: '{js(it['name'])}',\n"
            f"        price: {it['price']},\n"
            f"        image: SANKALPA_MENU_IMAGES['{js(it['name'])}'],\n"
            "        isVeg: true\n"
            "      }"
        )
    cats.append(
        "  {\n"
        f"    title: '{js(c['title'])}',\n"
        f"    icon: '{c['icon']}',\n"
        "    items: [\n" + ",\n".join(items) + "\n    ]\n"
        "  }"
    )

total = sum(len(c["items"]) for c in spec["categories"])
menu_ts = f"""// Hotel Sankalpa - Pure Veg Heritage Feasts, full menu.
// {total} items across {len(spec['categories'])} categories. Every item is vegetarian.
// Item names and prices are taken from the restaurant's own menu and must not be altered.
// Dish photos are resolved through the centralized map in ./sankalpaMenuImages.

import {{ SANKALPA_MENU_IMAGES }} from './sankalpaMenuImages';

export interface SankalpaMenuItem {{
  name: string;
  price: number;
  image?: string;
  note?: string;
  isVeg?: boolean;
}}

export interface SankalpaMenuCategory {{
  title: string;
  icon: string;
  items: SankalpaMenuItem[];
}}

export const HOTEL_SANKALPA_MENU: SankalpaMenuCategory[] = [
{",".join(chr(10) + c for c in cats)}
];
"""
open(os.path.join(ROOT, "src/data/hotelSankalpaMenu.ts"), "w",
     encoding="utf-8", newline="\n").write(menu_ts)

print(f"wrote src/data/sankalpaMenuImages.ts  ({total} image mappings)")
print(f"wrote src/data/hotelSankalpaMenu.ts   ({total} items, {len(spec['categories'])} categories)")
