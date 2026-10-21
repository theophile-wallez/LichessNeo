"""The board textures (public/img/boards): one grey relief per material, which
styles/board/pieces.css lays over a board's two colors in `hard-light`.

Each material is drawn in color from seeded noise, then turned into its
relief: every pixel's lightness around its shade's mean, mid-grey where it
equals it, so the relief over the material's own colors gives the drawing
back. Lengths are in design pixels, a square being 80 of them, whatever size
the board is drawn at. Prints each material's mean colors, which its ready-made
board (content/packs/materials.ts) takes. Needs NumPy, SciPy and Pillow.

  python3 tools/board-materials/generate.py [material …]
"""

import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image

from drawing import BOARD, checker
from materials import MATERIALS

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/img/boards'
QUALITY = 86


def lightness(image):
    return image @ np.array([0.2126, 0.7152, 0.0722])


def relief(image):
    """Each pixel's lightness as a gap from its shade's mean, scaled so hard-light undoes it."""
    level = lightness(image)
    dark = checker()
    out = np.zeros_like(level)
    for shade in (dark, ~dark):
        mean = level[shade].mean()
        gap = level[shade] - mean
        out[shade] = np.where(gap < 0, 0.5 + gap / (2 * mean), 0.5 + gap / (2 * (255 - mean)))
    return np.clip(out * 255, 0, 255).astype(np.uint8)


def mean_color(image, shade):
    red, green, blue = (int(round(value)) for value in image[shade].mean(axis=0))
    return f'#{red:02x}{green:02x}{blue:02x}'


def main(names):
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (draw, gain) in MATERIALS.items():
        if names and name not in names:
            continue
        rng = np.random.default_rng(zlib.crc32(name.encode()))
        image = np.clip(draw(rng), 0, 255)
        dark = checker()
        level = relief(image)
        if gain != 1:
            level = np.clip(128 + (level.astype(float) - 128) * gain, 0, 255).astype(np.uint8)
        Image.fromarray(level, 'L').save(OUT / f'{name}.webp', quality=QUALITY)
        print(f'{name}: light {mean_color(image, ~dark)}, dark {mean_color(image, dark)}')
    print(f'{BOARD}px boards in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main(sys.argv[1:])
