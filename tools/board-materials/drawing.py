"""What the materials are drawn with: seeded noise, color ramps, the checker,
squares cut from a bigger slab, the seams between squares.

Arrays are in real pixels; every length given to these helpers is in design
pixels (a square is 80), scaled by UNIT.
"""

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

BOARD = 1024
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


def squares(draw):
    """A board of squares each drawn on its own by `draw(rng, dark)`."""
    def board(rng):
        out = np.zeros((BOARD, BOARD, 3))
        for row in range(8):
            for column in range(8):
                cell = np.s_[row * SQUARE : (row + 1) * SQUARE, column * SQUARE : (column + 1) * SQUARE]
                out[cell] = draw(rng, (row + column) % 2 == 1)
        return out

    return board


def cuts(make, rng, turned=None):
    """Each square cut from another place of a slab twice the board's size, a quarter turn
    where `turned(row, column)`."""
    slab = make(BOARD * 2, BOARD * 2)
    out = np.zeros((BOARD, BOARD, 3))
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
