"""What the materials are drawn with: seeded noise, color ramps, the checker,
squares cut from a bigger slab, the seams between squares, and the relief a
finished board is turned into.

Arrays are in real pixels; every length given to these helpers is in design
pixels (a square is 80), scaled by UNIT.
"""

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

BOARD = 2048
SQUARE = BOARD // 8
UNIT = SQUARE / 80


def hex_color(text):
    return np.array([int(text[i : i + 2], 16) for i in (1, 3, 5)], float)


def noise(height, width, cell, rng, stretch=(1, 1)):
    """Smooth noise in 0–1, its blobs `cell` across, longer along an axis by `stretch`."""
    cell = cell * UNIT
    rows = max(2, int(height / cell / stretch[0]) + 3)
    columns = max(2, int(width / cell / stretch[1]) + 3)
    grid = rng.random((rows, columns))
    smooth = ndimage.zoom(grid, (height / (rows - 3), width / (columns - 3)), order=3)
    return smooth[:height, :width]


def fbm(height, width, cell, rng, octaves=4, stretch=(1, 1)):
    """Octaves of noise, each half the size and weight of the last, stretched to 0–1."""
    total, weight, weights = np.zeros((height, width)), 1.0, 0.0
    for _ in range(octaves):
        total += weight * noise(height, width, cell, rng, stretch)
        weights += weight
        weight /= 2
        cell = max(1.5 / UNIT, cell / 2)
    total /= weights
    return (total - total.min()) / (total.max() - total.min() + 1e-9)


def to_light(image):
    """A color 0–255 as the light it sends back, 0–1: sRGB is not that, and anything
    weighed in light (a lightness, a step of one) has to be done here."""
    value = np.clip(image, 0, 255) / 255
    return np.where(value <= 0.04045, value / 12.92, ((value + 0.055) / 1.055) ** 2.4)


def from_light(linear):
    """Light 0–1 back to a color 0–255."""
    linear = np.clip(linear, 0, 1)
    return 255 * np.where(linear <= 0.0031308, 12.92 * linear, 1.055 * linear ** (1 / 2.4) - 0.055)


def lightness_star(image):
    """CIE L*, 0 to 100, which the measurements of real wood (wood.py) are in. Nothing
    like the plain luma the relief is built from: this one is the eye's own scale."""
    luminance = to_light(image) @ np.array([0.2126, 0.7152, 0.0722])
    root = np.where(luminance > 0.008856, np.cbrt(luminance), 7.787 * luminance + 16 / 116)
    return 116 * root - 16


def ramp(level, stops):
    """`level` (0–1) through evenly spaced colors."""
    level = np.clip(level, 0, 1)
    positions = np.linspace(0, 1, len(stops))
    colors = np.array([hex_color(stop) for stop in stops])
    return np.stack([np.interp(level, positions, colors[:, k]) for k in range(3)], -1)


def checker():
    """True on the dark squares, a8 light."""
    rows, columns = np.mgrid[0:BOARD, 0:BOARD]
    return (rows // SQUARE + columns // SQUARE) % 2 == 1


def compose(light, dark):
    return np.where(checker()[..., None], dark, light)


def relief(image):
    """Each channel as a gap from its shade's own mean, scaled so hard-light undoes it.
    A channel never strays further from its mean than the mean is from either end, so
    nothing here is ever clipped and the round trip comes back to within the relief's own
    eight bits (checked: under 2 of 255)."""
    dark = checker()
    out = np.zeros_like(image)
    for shade in (dark, ~dark):
        mean = image[shade].mean(axis=0)
        gap = image[shade] - mean
        out[shade] = np.where(gap < 0, 0.5 + gap / (2 * mean), 0.5 + gap / (2 * (255 - mean)))
    return np.clip(out * 255, 0, 255).astype(np.uint8)


def mean_color(image, shade):
    red, green, blue = (round(value) for value in image[shade].mean(axis=0))
    return f'#{red:02x}{green:02x}{blue:02x}'


def spreads(image, dark):
    """How far a shade's lightness spreads, in CIE L*: inside one square, and from one
    square to the next. The measurements of real wood (species.py) are in those units, so
    this is what says whether a wood came out as its own."""
    level = lightness_star(image)
    middles, insides = [], []
    for row in range(8):
        for column in range(8):
            if ((row + column) % 2 == 1) != dark:
                continue
            rows = slice(row * SQUARE, (row + 1) * SQUARE)
            columns = slice(column * SQUARE, (column + 1) * SQUARE)
            middles.append(level[rows, columns].mean())
            insides.append(level[rows, columns].std())
    return f'{np.mean(insides):.1f} inside a square and {np.std(middles):.1f} between them'


def squares(draw):
    """A board of squares each drawn on its own by `draw(rng, dark)`."""

    def board(rng):
        out = np.zeros((BOARD, BOARD, 3))
        for row in range(8):
            for column in range(8):
                rows = slice(row * SQUARE, (row + 1) * SQUARE)
                columns = slice(column * SQUARE, (column + 1) * SQUARE)
                out[rows, columns] = draw(rng, (row + column) % 2 == 1)
        return out

    return board


def cuts(make, rng, turned=None):
    """Each square cut from another place of a slab twice the board's size, a quarter turn
    where `turned(row, column)`. The slab may be in color or a plain field."""
    slab = make(BOARD * 2, BOARD * 2)
    out = np.zeros((BOARD, BOARD, *slab.shape[2:]))
    for row in range(8):
        for column in range(8):
            top, left = rng.integers(0, BOARD * 2 - SQUARE, 2)
            piece = slab[top : top + SQUARE, left : left + SQUARE]
            if turned and turned(row, column):
                piece = np.rot90(piece)
            out[row * SQUARE : (row + 1) * SQUARE, column * SQUARE : (column + 1) * SQUARE] = piece
    return out


def seams(image, color, width=1.0, opacity=0.5):
    """A line `width` wide between the squares."""
    rows, columns = np.mgrid[0:BOARD, 0:BOARD]
    inside_row, inside_column = rows % SQUARE, columns % SQUARE
    edge = np.minimum(
        np.minimum(inside_row, SQUARE - 1 - inside_row),
        np.minimum(inside_column, SQUARE - 1 - inside_column),
    )
    cover = np.clip(width * UNIT + 0.5 - edge, 0, 1)[..., None] * opacity
    return image * (1 - cover) + hex_color(color) * cover


def polygons(background, shapes):
    """Filled polygons over a plain background: `shapes` gives (points, color) pairs."""
    image = Image.new('RGB', (BOARD, BOARD), background)
    pen = ImageDraw.Draw(image)
    for points, color in shapes:
        pen.polygon(points, fill=color)
    return np.asarray(image).astype(float)
