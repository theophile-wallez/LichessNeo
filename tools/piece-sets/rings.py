"""The rings a piece set of ours draws around its pieces where they blend into
their square (styles/board/piece-rings.css), from its converted images in
public/img/pieces.

For each piece, a mask of the ring just outside its silhouette, saved beside
it in rings/; then, for each side, the mean OKLab lightness of its pieces'
edges, which the stylesheet compares with each square's. Needs Pillow and
NumPy.

  python3 tools/piece-sets/rings.py <set id>…
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
PIECES = ROOT / 'public/img/pieces'
NAMES = [color + role for color in 'wb' for role in 'KQRBNP']
# In pixels of the 384px images: about 1% of a square, softened by the blur.
RING_WIDTH = 4
RING_BLUR = 1.6
# A ring is a soft thing: half the piece's size draws it as well.
MASK_SIZE = 192
# The band inside the silhouette whose color meets the square.
EDGE_WIDTH = 4

LMS = np.array([
    [0.4122214708, 0.5363325363, 0.0514459929],
    [0.2119034982, 0.6806995451, 0.1073969566],
    [0.0883024619, 0.2817188376, 0.6299787005],
])
LAB_L = np.array([0.2104542553, 0.7936177850, -0.0040720468])


def lightness(rgb: np.ndarray) -> np.ndarray:
    """OKLab's L of sRGB colors in 0-255."""
    linear = rgb / 255
    linear = np.where(linear <= 0.04045, linear / 12.92, ((linear + 0.055) / 1.055) ** 2.4)
    return np.cbrt(linear @ LMS.T) @ LAB_L


def ring(alpha: Image.Image) -> Image.Image:
    grown = alpha.filter(ImageFilter.MaxFilter(2 * RING_WIDTH + 1))
    grown = grown.filter(ImageFilter.GaussianBlur(RING_BLUR))
    outside = np.asarray(grown, float) - np.asarray(alpha, float)
    return Image.fromarray(np.clip(outside, 0, 255).astype(np.uint8))


def edge_lightness(image: Image.Image) -> np.ndarray:
    alpha = image.getchannel('A')
    inner = np.asarray(alpha.filter(ImageFilter.MinFilter(2 * EDGE_WIDTH + 1)))
    pixels = np.asarray(image, float)
    band = (pixels[..., 3] > 200) & (inner < 128)
    return lightness(pixels[..., :3][band])


def rings(folder: Path) -> None:
    target = folder / 'rings'
    target.mkdir(exist_ok=True)
    edges: dict[str, list[np.ndarray]] = {'w': [], 'b': []}
    for name in NAMES:
        image = Image.open(folder / f'{name}.webp').convert('RGBA')
        mask = Image.new('RGBA', image.size, (255, 255, 255, 0))
        mask.putalpha(ring(image.getchannel('A')))
        mask = mask.resize((MASK_SIZE, MASK_SIZE), Image.LANCZOS)
        mask.save(target / f'{name}.webp', 'WEBP', quality=90, alpha_quality=90, method=6)
        edges[name[0]].append(edge_lightness(image))
    white, black = (np.concatenate(edges[side]).mean() for side in 'wb')
    print(f'{folder.name}: edges {white:.3f} (white), {black:.3f} (black)')


if __name__ == '__main__':
    for set_id in sys.argv[1:]:
        rings(PIECES / set_id)
