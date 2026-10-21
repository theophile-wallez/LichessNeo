"""The materials, each drawn in color on a whole board (drawing.py). Woods and
stones are cut square by square from a bigger slab, so no two squares match;
the marble is one slab across the board, as a real one is."""

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree

from drawing import (
    BOARD,
    SQUARE,
    UNIT,
    compose,
    cuts,
    fbm,
    hex_color,
    noise,
    polygons,
    ramp,
    seams,
    squares,
)


def grain(height, width, rng, density):
    """Straight wood grain along the columns: growth rings, wavering, and fibres."""
    columns = np.mgrid[0:height, 0:width][1] / UNIT
    waver = fbm(height, width, 160, rng, 3) * 56
    rings = 0.5 + 0.5 * np.sin((columns + waver) * density + fbm(height, width, 60, rng, 2) * 3)
    fibres = noise(height, width, 2.2, rng, stretch=(18, 1))
    return 0.55 * rings**1.6 + 0.3 * fibres + 0.15 * fbm(height, width, 40, rng, 3)


def wood(stops, rng, density=0.09):
    return lambda height, width: ramp(grain(height, width, rng, density), stops)


def ash(rng):
    light = cuts(wood(['#d8cdb8', '#e7decc', '#f2ece0'], rng, 0.07), rng)
    dark = cuts(wood(['#2e3678', '#3c4596', '#4c56ae'], rng, 0.07), rng)
    return compose(light, dark)


# The grain turns a quarter at each row, as in a real inlay.
def parquet(rng):
    light = cuts(wood(['#d9b98a', '#ead2a8', '#f1dfbd'], rng), rng, lambda row, _: row % 2 == 0)
    dark = cuts(wood(['#5a4130', '#6e5039', '#82624a'], rng, 0.11), rng, lambda row, _: row % 2 == 1)
    return seams(compose(light, dark), '#2a1d14', 0.6, 0.35)


def year_bounds(rng, spacing, count=400):
    """Where each growth ring ends: wide and narrow years, as a tree grows."""
    swing = 1 + 0.4 * np.sin(np.arange(count) / rng.uniform(4, 12))
    widths = spacing * rng.lognormal(0, 0.35, count) * swing
    return np.concatenate([[0], np.cumsum(np.maximum(widths, spacing * 0.25))])


def log_end(rng, dark):
    """A square cut across its own log: the pith inside it, near it, or far off."""
    rows, columns = np.mgrid[0:SQUARE, 0:SQUARE] / UNIT
    kind = rng.choice(['pith', 'arcs', 'straight'], p=[0.3, 0.4, 0.3])
    if kind == 'pith':
        center_row, center_column = rng.uniform(12, 68, 2)
    else:
        distance = (rng.uniform(0.7, 1.6) if kind == 'arcs' else rng.uniform(2.5, 6)) * 80
        angle = rng.uniform(0, 2 * np.pi)
        center_row, center_column = 40 + distance * np.sin(angle), 40 + distance * np.cos(angle)
    tilt, squash = rng.uniform(0, np.pi), rng.uniform(0.75, 1.0)
    down, across = rows - center_row, columns - center_column
    along = across * np.cos(tilt) + down * np.sin(tilt)
    beside = (-across * np.sin(tilt) + down * np.cos(tilt)) / squash
    radius = np.hypot(along, beside) + fbm(SQUARE, SQUARE, 22, rng, 3) * rng.uniform(2, 7)
    angle = np.arctan2(down, across)
    bounds = year_bounds(rng, rng.uniform(2.6, 6.5))
    year = np.interp(radius, bounds, np.arange(len(bounds)))
    season = year % 1
    # Latewood darkens toward the year's end, then the next year starts pale.
    start = rng.uniform(0.35, 0.65)
    late = np.clip((season - start) / (0.95 - start), 0, 1) ** 1.3 * (season < 0.95)
    late = late + (season >= 0.95) * np.clip((1 - season) / 0.05, 0, 1)
    level = 0.8 - rng.uniform(0.45, 0.65) * late + 0.12 * (noise(SQUARE, SQUARE, 1.4, rng) - 0.5)
    rays = rng.random(1440) < 0.08
    level = level + rays[((angle + np.pi) / (2 * np.pi) * 1440).astype(int) % 1440] * (radius > 4) * 0.07
    level = level - np.clip((rng.uniform(8, 30) - year) / 3, 0, 1) * rng.uniform(0.05, 0.14)
    if kind == 'pith':
        level = level - np.exp(-(down**2 + across**2) / 3) * 0.5
        for _ in range(rng.integers(0, 3)):
            heading, length = rng.uniform(-np.pi, np.pi), rng.uniform(10, 40)
            off = np.abs(np.angle(np.exp(1j * (angle - heading))))
            level = level - ((off < 0.05 * (1 - radius / length)) & (radius < length)) * 0.45
    stops = ['#4a2f1d', '#6a4429', '#80563a'] if dark else ['#b98e5c', '#d9b483', '#ecd0a3']
    tint = rng.uniform(0.9, 1.06) * np.array([1, rng.uniform(0.97, 1.02), rng.uniform(0.94, 1.03)])
    return np.clip(ramp(level, stops) * tint, 0, 255)


def end_grain(rng):
    return seams(squares(log_end)(rng), '#3a2516', 0.7, 0.45)


def veins(rng, scale, sharpness):
    """A marble's veins, ridges of warped noise, and its clouds."""
    rows, columns = np.mgrid[0:BOARD, 0:BOARD].astype(float)
    pad = int(200 * UNIT)
    warp_rows = fbm(BOARD, BOARD, 260, rng, 3) * 90 * UNIT
    warp_columns = fbm(BOARD, BOARD, 260, rng, 3) * 90 * UNIT
    field = ndimage.map_coordinates(
        fbm(BOARD + pad, BOARD + pad, 300 * scale, rng, 6),
        [rows + warp_rows, columns * 0.45 + warp_columns + rows * 0.4],
        order=1,
        mode='reflect',
    )
    main = (1 - np.abs(2 * field - 1)) ** (sharpness * 3)
    hairline = (1 - np.abs(2 * fbm(BOARD, BOARD, 90, rng, 5) - 1)) ** (sharpness * 4)
    return np.clip(main + 0.5 * hairline, 0, 1)[..., None], fbm(BOARD, BOARD, 140, rng, 4)


def marble(rng):
    vein, cloud = veins(rng, 1.0, 14)
    light = ramp(0.75 + 0.25 * cloud, ['#e6e2db', '#f3f0ea', '#faf8f4'])
    light = light * (1 - 0.55 * vein) + hex_color('#b39a6a') * 0.55 * vein
    vein, cloud = veins(rng, 1.2, 18)
    dark = ramp(cloud, ['#525a66', '#606875', '#6e7784'])
    dark = dark * (1 - 0.8 * vein) + hex_color('#d9d6cf') * 0.8 * vein
    return compose(light, dark)


def chips(rng, binder, colors, count):
    """Terrazzo: stone chips, a few sizes, scattered in a binder."""
    shapes = []
    hues, shares = zip(*colors)
    for _ in range(count):
        center = rng.uniform(-16, BOARD + 16, 2)
        size = rng.choice([2, 3.5, 5.5], p=[0.5, 0.35, 0.15]) * UNIT
        corners = np.sort(rng.uniform(0, 2 * np.pi, rng.integers(4, 7)))
        reach = size * rng.uniform(0.6, 1.2, len(corners))
        points = [tuple(center + r * np.array([np.cos(a), np.sin(a)])) for a, r in zip(corners, reach)]
        shapes.append((points, hues[rng.choice(len(hues), p=shares)]))
    return polygons(binder, shapes) * (0.97 + 0.06 * noise(BOARD, BOARD, 1.5, rng))[..., None]


def terrazzo(rng):
    light = chips(rng, '#efece6', [('#aab2e6', 0.35), ('#f2b4a2', 0.3), ('#c9ccd2', 0.35)], 420)
    dark = chips(rng, '#3f49a7', [('#5c67c4', 0.45), ('#7d87dc', 0.3), ('#323b92', 0.25)], 420)
    return compose(light, dark)


def slate(rng):
    def stone(stops, cleave):
        return lambda height, width: ramp(
            0.6 * fbm(height, width, 90, rng, 4)
            + 0.4 * noise(height, width, 2, rng, stretch=(1, cleave)),
            stops,
        )

    light = cuts(stone(['#c9c3b6', '#d6d1c6', '#e2ded5'], 14), rng)
    dark = cuts(stone(['#4a5460', '#56616e', '#64707d'], 22), rng)
    return seams(compose(light, dark), '#1c2026', 0.8, 0.55)


def brushed_plate(rng, dark):
    rows, columns = np.mgrid[0:SQUARE, 0:SQUARE] / SQUARE
    strokes = noise(SQUARE, SQUARE, 1.4, rng, stretch=(1, 30))
    sheen = 0.5 + 0.5 * np.cos((columns * 0.7 + rows * 0.3 + rng.uniform(0, 1)) * np.pi * 1.4)
    stops = ['#2a3170', '#3b4499', '#5862bf'] if dark else ['#b9bcc4', '#d3d6dc', '#eef0f3']
    return ramp(0.25 + 0.45 * sheen + 0.3 * strokes, stops)


def brushed(rng):
    return seams(squares(brushed_plate)(rng), '#20232b', 0.5, 0.5)


def spun_dial(rng, dark):
    rows, columns = (np.mgrid[0:SQUARE, 0:SQUARE] - SQUARE / 2 + 0.5) / UNIT
    radius, angle = np.hypot(rows, columns), np.arctan2(rows, columns)
    steps = np.arange(0, 80, 0.5)
    rings = np.interp(radius, steps, rng.random(len(steps)))
    sheen = 0.5 + 0.5 * np.cos(2 * (angle - rng.uniform(0.6, 0.9)))
    stops = ['#5b4a2c', '#8c7445', '#c9ad73'] if dark else ['#b8b9bd', '#d8d9dc', '#f2f2f4']
    return ramp(0.2 + 0.55 * sheen + 0.25 * rings, stops)


def spun(rng):
    return seams(squares(spun_dial)(rng), '#1d1e22', 0.6, 0.45)


def glazed_tile(rng, dark):
    """A zellige tile: its own tone, its glaze pooling at the edges, a glint."""
    rows, columns = np.mgrid[0:SQUARE, 0:SQUARE] / UNIT
    tones = ['#1f6f78', '#24808a', '#1b5f6b', '#2b8a92'] if dark else ['#f1ece1', '#ebe4d6', '#f5f1ea', '#e7dfcf']
    base = hex_color(tones[rng.integers(len(tones))])
    glaze = fbm(SQUARE, SQUARE, 26, rng, 3)
    edge = np.minimum(np.minimum(rows, 79 - rows), np.minimum(columns, 79 - columns))
    pool = np.clip(1 - (edge + noise(SQUARE, SQUARE, 12, rng) * 4) / 9, 0, 1)
    shade = 1 - 0.18 * (glaze - 0.5) - 0.22 * pool
    glint_row, glint_column = rng.uniform(16, 28), rng.uniform(20, 32)
    glint = np.exp(-((columns - glint_column) ** 2 + (rows - glint_row) ** 2) / (2 * 9**2)) * 0.1
    return np.clip(base * shade[..., None] + 255 * glint[..., None], 0, 255)


def zellige(rng):
    return seams(squares(glazed_tile)(rng), '#d9d2c4', 1.3, 0.85)


def felt(rng):
    def cloth(stops):
        def draw(height, width):
            fuzz = ndimage.gaussian_filter(rng.random((height, width)), 0.8 * UNIT)
            fuzz = (fuzz - fuzz.mean()) / fuzz.std()
            return ramp(0.5 + 0.1 * fuzz + 0.15 * (fbm(height, width, 60, rng, 2) - 0.5), stops)

        return draw

    light = cuts(cloth(['#d9d0bd', '#e6dfcf', '#f0eadf']), rng)
    dark = cuts(cloth(['#1f4d3f', '#275c4c', '#2f6b59']), rng)
    return compose(light, dark)


def stitches(image):
    """A saddle stitch around the board, as on a leather travel set."""
    inset, dash, step = round(5 * UNIT), round(5 * UNIT), round(9 * UNIT)
    thread = hex_color('#ecdec4')
    for start in range(0, BOARD, step):
        span = slice(start, min(start + dash, BOARD))
        for line in (np.s_[inset : inset + 2, span], np.s_[span, inset : inset + 2]):
            image[line] = thread
        far = BOARD - inset - 2
        for line in (np.s_[far : far + 2, span], np.s_[span, far : far + 2]):
            image[line] = thread
    return image


def leather(rng):
    tree = cKDTree(rng.random((60000, 2)) * BOARD)
    rows, columns = np.mgrid[0:BOARD, 0:BOARD]
    distances, _ = tree.query(np.c_[rows.ravel(), columns.ravel()], k=2)
    pebble = np.clip((distances[:, 1] - distances[:, 0]).reshape(BOARD, BOARD) / UNIT / 1.6, 0, 1)
    level = 0.35 + 0.3 * pebble + 0.35 * fbm(BOARD, BOARD, 140, rng, 3)
    light = ramp(level, ['#b89a74', '#cdb08a', '#dcc29f'])
    dark = ramp(level, ['#5e3628', '#704333', '#82513e'])
    return stitches(seams(compose(light, dark), '#2a1710', 0.9, 0.5))


def grid_lines(step, width):
    """How much of each pixel a line every `step` (design px) covers."""
    columns = np.mgrid[0:BOARD, 0:BOARD][1] / UNIT
    offset = columns % step
    return np.clip((width - np.minimum(offset, step - offset)) * UNIT + 0.5, 0, 1)


def blueprint(rng):
    paper = fbm(BOARD, BOARD, 110, rng, 4)
    image = compose(
        ramp(paper, ['#4a82d6', '#5590e0', '#619ce8']),
        ramp(paper, ['#163a7c', '#1a4189', '#1e4994']),
    )
    lines = grid_lines(16, 0.3)
    fine = np.maximum(lines, lines.T)[..., None] * 0.1
    image = image * (1 - fine) + 235 * fine
    return seams(image, '#ebebeb', 0.5, 0.45)


def halftone(rng):
    paper = ramp(fbm(BOARD, BOARD, 90, rng, 4), ['#ece6d8', '#f3eee3', '#f7f3ea'])
    rows, columns = np.mgrid[0:BOARD, 0:BOARD] / UNIT
    pitch = 7.0
    along, across = (columns + rows) / np.sqrt(2), (columns - rows) / np.sqrt(2)
    off = np.hypot(along % pitch - pitch / 2, across % pitch - pitch / 2)
    radius = 2.3 + 0.6 * fbm(BOARD, BOARD, 120, rng, 2)
    ink = np.clip((radius - off) * UNIT + 0.5, 0, 1) * (0.85 + 0.15 * noise(BOARD, BOARD, 3, rng))
    ink = ink[..., None] * 0.92
    return compose(paper, paper * (1 - ink) + hex_color('#4855d0') * ink)


def cork(rng):
    def granules(stops):
        def draw(height, width):
            count = int(height * width / UNIT**2 / 18)
            tree = cKDTree(rng.random((count, 2)) * [height, width])
            tones = rng.random(count)
            rows, columns = np.mgrid[0:height, 0:width]
            distances, nearest = tree.query(np.c_[rows.ravel(), columns.ravel()], k=2)
            rim = np.clip((distances[:, 1] - distances[:, 0]) / UNIT / 1.5, 0, 1)
            level = (tones[nearest[:, 0]] * 0.7 + 0.3 * rim).reshape(height, width)
            return ramp(0.6 * level + 0.4 * fbm(height, width, 60, rng, 2), stops)

        return draw

    light = cuts(granules(['#b88b58', '#cfa472', '#e2bd8c']), rng)
    dark = cuts(granules(['#4c3424', '#5f412c', '#735037']), rng)
    return compose(light, dark)


# Each material and how much of its relief the texture keeps: the busiest are toned down.
MATERIALS = {
    'ash': (ash, 1),
    'parquet': (parquet, 1),
    'end-grain': (end_grain, 1),
    'marble': (marble, 1),
    'terrazzo': (terrazzo, 1),
    'slate': (slate, 1),
    'brushed': (brushed, 0.8),
    'spun': (spun, 0.75),
    'zellige': (zellige, 0.6),
    'felt': (felt, 1),
    'leather': (leather, 1),
    'blueprint': (blueprint, 1),
    'halftone': (halftone, 1),
    'cork': (cork, 1),
}
