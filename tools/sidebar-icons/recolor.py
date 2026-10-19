"""The sidebar's icons (public/img/sidebar), recolored from their full-size
drawings.

Each section's icon has a color of its own, and so has each of its flyout's
links. Each pixel of a drawing falls in a band of hue (its purple, pink, cyan, and the
slate of its shadows and hair) or in none (skin, eyes, white glints, which
stay). A section maps each band to a color: the pixel takes that color's hue,
and its lightness and saturation move around it as they did around the band's
median, so the shading stays. Then each icon is cropped to its drawing and
scaled so all cover about the same share of their square, a wide one as much
as a tall one. Needs Pillow.

  python3 tools/sidebar-icons/recolor.py <folder of the full-size PNGs>
"""

import colorsys
import statistics
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/img/sidebar'
SIZE = 96
# The share of its square an icon's drawing covers, once scaled.
COVERAGE = 0.5
BANDS = {
    # People's blue hair, in the drawings that map it: elsewhere it's shading.
    'hair': lambda hue, saturation, lightness: (
        218 <= hue < 242 and 0.25 <= saturation < 0.62 and lightness < 0.75
    ),
    'slate': lambda hue, saturation, lightness: (
        205 <= hue < 245 and saturation < 0.45 and lightness < 0.55
    ),
    'purple': lambda hue, saturation, lightness: 205 <= hue < 292 and saturation >= 0.12,
    'pink': lambda hue, saturation, lightness: (hue >= 292 or hue < 8) and saturation >= 0.3,
    'cyan': lambda hue, saturation, lightness: 160 <= hue < 205 and saturation >= 0.25,
}
# The icons' colors: each a main one for the drawing's purple and two
# supporting ones for its pink and its cyan. A band left out keeps its color;
# 'slate' left out goes with 'purple', as the shading under it.
COLORS = {
    'mint': {'purple': '#65d6a6', 'pink': '#efe6d2', 'cyan': '#2fae7c'},
    'amber': {'purple': '#f2c66d', 'pink': '#e8954a', 'cyan': '#fff1cf'},
    'sky': {'purple': '#79b8ff', 'pink': '#f3e6c4', 'cyan': '#d6ebff'},
    'coral': {'purple': '#f28c82', 'pink': '#de6a60', 'cyan': '#c6e6ff'},
    'lavender': {'purple': '#b69af7', 'pink': '#e07a5f', 'cyan': '#f2c66d'},
    'steel': {'purple': '#b4c3d1', 'pink': '#4f86d9', 'cyan': '#dbe3ea'},
    'rose': {'purple': '#ef91b5', 'pink': '#c95b86', 'cyan': '#fff1cf'},
    'teal': {'purple': '#4fc3c8', 'pink': '#f2c66d', 'cyan': '#d8f4f4'},
    'peach': {'purple': '#f5a97f', 'pink': '#e07a5f', 'cyan': '#fff1cf'},
}
# People's blue and slate hair turns brown, so it doesn't take the icon's color.
HAIR = {'hair': '#6b4a35', 'slate': '#5a4033'}

# The sections' own icons, tuned one by one.
SECTIONS = {
    'play': {'purple': '#efe6d2', 'pink': '#65d6a6', 'cyan': '#2fae7c'},
    'puzzles': {'purple': '#f2c66d', 'pink': '#e8954a'},
    'learn': {'purple': '#79b8ff', 'pink': '#f3e6c4', 'cyan': '#f3e6c4'},
    'watch-binoculars': {'purple': '#f28c82', 'pink': '#de6a60', 'cyan': '#c6e6ff'},
    'community': {**COLORS['lavender'], **HAIR},
    'tools': {'purple': '#b4c3d1', 'pink': '#4f86d9', 'cyan': '#dbe3ea'},
    'donation': {'purple': '#efe3c8', 'pink': '#d9668f', 'cyan': '#ef91b5'},
}
# The flyouts' links, each in a color of its own that suits it (a gold trophy,
# a red flame), and unlike the links beside it.
LINKS = {
    # Play
    'friendly-challenge': 'peach',
    'arena-tournaments': 'amber',
    'swiss-tournaments': 'steel',
    'simultaneous-exhibitions': 'mint',
    # Puzzles
    'puzzle-themes': 'rose',
    'puzzle-dashboard': 'sky',
    'puzzle-streak': 'coral',
    'puzzle-storm': 'lavender',
    'puzzle-racer': 'teal',
    # Learn
    'chess-basics': 'mint',
    'practice': 'coral',
    'coordinate-practice': 'sky',
    'study': 'amber',
    'coach': 'lavender',
    # Watch
    'broadcasts': 'teal',
    'lichess-tv': 'coral',
    'current-games': 'lavender',
    'streamers': 'rose',
    'video-library': 'amber',
    # Community
    'friends': 'rose',
    'teams': 'sky',
    'forum': 'mint',
    'blog': 'amber',
    # Tools
    'analysis-board': 'sky',
    'openings': 'mint',
    'board-editor': 'amber',
    'import-game': 'coral',
    'advanced-search': 'lavender',
}
PEOPLE = {'coach', 'friends'}
for name, color in LINKS.items():
    SECTIONS[name] = {**COLORS[color], **(HAIR if name in PEOPLE else {})}


def hls(pixel):
    r, g, b, _ = pixel
    hue, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return hue * 360, saturation, lightness


def band_of(hue, saturation, lightness, mapping):
    for name, test in BANDS.items():
        if name == 'hair' and name not in mapping:
            continue
        if test(hue, saturation, lightness):
            return name if name != 'slate' or 'slate' in mapping else 'purple'
    return None


def recolor(image, mapping):
    pixels = image.load()
    width, height = image.size
    bands = {}
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] < 16:
                continue
            hue, saturation, lightness = hls(pixels[x, y])
            band = band_of(hue, saturation, lightness, mapping)
            if band in mapping:
                bands.setdefault(band, []).append((x, y, saturation, lightness))
    for band, points in bands.items():
        target = mapping[band].lstrip('#')
        th, tl, ts = colorsys.rgb_to_hls(*(int(target[i : i + 2], 16) / 255 for i in (0, 2, 4)))
        mid_l = statistics.median(p[3] for p in points)
        mid_s = statistics.median(p[2] for p in points)
        for x, y, saturation, lightness in points:
            new_l = min(0.97, max(0.04, tl + (lightness - mid_l) * 0.9))
            new_s = min(1, ts * min(1.3, max(0.5, saturation / mid_s)))
            r, g, b = colorsys.hls_to_rgb(th, new_l, new_s)
            pixels[x, y] = (round(r * 255), round(g * 255), round(b * 255), pixels[x, y][3])
    return image


def normalize(image):
    alpha = image.getchannel('A').point(lambda a: 255 if a > 24 else 0)
    left, top, right, bottom = alpha.getbbox()
    drawing = image.crop((left, top, right, bottom))
    side = max(drawing.size)
    covered = sum(1 for a in drawing.getchannel('A').get_flattened_data() if a > 24) / side**2
    # A dense drawing (a bag, a puzzle piece) shrinks to look as big as a sparse one (tools).
    scale = min(0.98, (COVERAGE / covered) ** 0.5)
    canvas_side = round(side / scale)
    canvas = Image.new('RGBA', (canvas_side, canvas_side), (0, 0, 0, 0))
    canvas.paste(drawing, ((canvas_side - drawing.width) // 2, (canvas_side - drawing.height) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def main(source):
    # Recolor at a working size: the full drawing's detail, a fraction of its pixels.
    def drawing(name, mapping):
        image = Image.open(Path(source) / f'{name}.png').convert('RGBA')
        return recolor(image.resize((512, 512), Image.LANCZOS), mapping)

    for name, mapping in SECTIONS.items():
        normalize(drawing(name, mapping)).save(
            OUT / f'{name}.webp', 'WEBP', quality=90, alpha_quality=100, method=6
        )
        print(OUT.relative_to(ROOT) / f'{name}.webp')


if __name__ == '__main__':
    main(sys.argv[1])
