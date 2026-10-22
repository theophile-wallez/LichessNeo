"""Wood, drawn to what real wood measures (species.py).

A square of a wooden board holds four things at once: the growth-ring lines a
plainsawn face cuts across, the pores between them, the broad figure that wanders
over both, and the eyes a dormant bud leaves. Which of them shows, and how much, is
all a wood is: a walnut is nearly all lines, a burl nearly all figure, and the
measurements say so in numbers rather than in a knob per wood.

The first woods here drew about one soft band per square, where a real wood shows
eight to twenty-seven sharp ones, no pores, no eyes, and every square the same color
as the next. `generate.py` prints each board's lightness spread, inside a square and
from square to square, which is the check that the drawing matches the wood.
"""

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from drawing import SQUARE, UNIT, compose, cuts, fbm, hex_color, lightness_star, noise
from species import SPECIES, STOPS

# A square is 50 mm on a tournament board, and 80 design pixels here.
MM = 80 / 50

# What a measurement is worth in the drawing. One set for every species, so what tells
# the woods apart is what was measured of each, not a knob per wood.
LINE_GAIN, PORE_GAIN = 0.055, 1.8

# How wide the broad figure is across the grain, in millimetres: twice the length its
# own tone held over on the reference board, 3.6 mm. Along the grain it runs `along`
# times further, which is the whole difference between a plainsawn face and a burl.
FIGURE_WIDTH = 7

# How far the grain winds off its own course, in figure widths, where there is nothing
# left to hold it straight: a burl's grain turns right round a bud.
MOST_WINDING = 4

# How far the grain wanders off straight as it runs down the plank, in millimetres. It is
# the wood's own doing and not its rings', so a finely lined wood wanders across several
# of its rings where a coarse one hardly leaves the ring it is in: the first woods tied
# this to the gap between rings, and the fine ones came out as straight as a barcode.
WAVER_WIDTH = 1.5

# How far from the wood's own color the stops may be stretched, when a species' lightness
# spread asks for more than they hold.
MOST_REACH = 1.8


def standard(values):
    """`values` around their own mean, one spread wide."""
    return (values - values.mean()) / (values.std() + 1e-9)


def wavering(length, cell, rng):
    """A smooth line down the slab, zero on average and one wide, swinging every `cell`
    design pixels: what varies along the grain and not across it."""
    step = cell * UNIT
    knots = rng.normal(0, 1, int(length / step) + 4)
    return ndimage.zoom(knots, step, order=3)[:length, None]


def line_bounds(rng, gap, uneven, count):
    """Where each grain line falls, in design pixels: a tree's years are never evenly
    wide, so the gaps spread around their mean rather than repeat."""
    sigma = np.sqrt(np.log(1 + uneven**2))
    gaps = gap * rng.lognormal(-(sigma**2) / 2, sigma, count)
    return np.concatenate([[0], np.cumsum(np.maximum(gaps, gap * 0.2))])


def year(height, width, rng, wood):
    """Which year of the tree each point of the slab falls in: the whole part counts the
    years out from the heart, the fraction tells how far into one it is, 0 just past a
    grain line and 1 at the next. The heart lies off to one side and well under the
    surface, so the lines run nearly straight, and they arch into a cathedral over the
    stretch where its depth drifts up towards it."""
    gap = 80 / wood.lines
    columns = np.mgrid[0:height, 0:width][1] / UNIT
    # A real plank's cathedral runs over 300 mm, six squares, so a square cut out of one
    # holds no more than a stretch of its arc: the depth drifts over more than the slab,
    # and never rises right under the surface, which only a board sawn through the heart
    # would show.
    depth = wood.arch * MM * (1.3 + 0.35 * wavering(height, 1400, rng))
    heart = rng.uniform(-0.2, 1.2) * width / UNIT
    waver = wavering(height, 40, rng) + 0.7 * wavering(height, 160, rng)
    radius = np.hypot(columns - heart, np.abs(depth)) + waver * WAVER_WIDTH * MM
    bounds = line_bounds(rng, gap, wood.uneven, int(radius.max() / gap) + 16)
    return np.interp(radius, bounds, np.arange(len(bounds)))


def latewood(height, width, rng, wood):
    """How deep into a year's dark end each point of the slab is, 0 in the pale wood and 1
    on the line itself. A year ends abruptly: the wood darkens through its latewood, then
    the next year starts pale against the line it left."""
    years = year(height, width, rng, wood)
    grown, count = years.astype(int), int(years.max()) + 2
    # No two years are as wide or as dark as each other, and no line holds its weight the
    # whole way down the plank: it thins out over a stretch and comes back.
    widths = wood.width * MM * wood.lines / 80 * rng.uniform(0.5, 1.7, count)
    share = np.clip(widths, 0.05, 0.85)[grown]
    late = np.clip((years % 1 - (1 - share)) / share, 0, 1) ** 1.4
    patchy = noise(height, width, 22, rng, stretch=(7, 1)) * 1.8 + 0.25
    return late * rng.uniform(0.45, 1.5, count)[grown] * patchy


def leaning(grain, skew):
    """`grain` bent so the figure leans the way the wood's does: a burl's whorls wind into
    thin dark bands over pale wood, which leans dark, where a maple's soft mottle leans
    neither way. A lognormal bends it, and at these widths its own skew is three times its
    width, which is near enough to take the width straight from the measurement."""
    side = 1.0 if skew >= 0 else -1.0
    return standard(side * np.exp(side * abs(skew) / 3 * grain))


def alone(size):
    """The steepest slope one bud on its own makes in its blurred field: the scale every
    bud's push is measured against, so that a crowd of them is not read as one."""
    side = round(6 * size)
    rows, columns = np.mgrid[0:side, 0:side] - side / 2
    down, across = np.gradient(
        ndimage.gaussian_filter((np.hypot(rows, columns) < size / 2).astype(float), size)
    )
    return float(np.hypot(down, across).max())


def parting(swell, size):
    """How far the grain is pushed aside by the buds, down the slab and across it. A bud's
    wood swells around it and the grain bows out of its way by about its radius, so the
    push is the slope of the buds' own field against what one bud alone gives. Where buds
    crowd, their pushes meet and cancel, as they do across a burl."""
    down, across = np.gradient(ndimage.gaussian_filter(swell, size))
    scale = size / (2 * alone(size))
    return down * scale, across * scale


def winding(height, width, rng, wood):
    """Where each point of the slab reads its grain from. A face whose figure runs with the
    grain reads it where it stands; a burl, whose grain turns round every bud it holds,
    reads it a whorl away. How far it winds is the one measurement that tells them apart,
    so the swing is the figure's width over how far the figure runs."""
    rows, columns = np.mgrid[0:height, 0:width].astype(float)
    swing = FIGURE_WIDTH * MM * UNIT * MOST_WINDING / wood.along
    cell = FIGURE_WIDTH * MM * 3
    return [
        rows + (fbm(height, width, cell, rng, 2) - 0.5) * swing,
        columns + (fbm(height, width, cell, rng, 2) - 0.5) * swing,
    ]


def figure(height, width, rng, wood, bent):
    """The broad figure over the slab, standardised: the tone a square shows a few
    millimetres across the grain and `along` times that along it, read off where the grain
    winds. A burl is this and little else."""
    source = fbm(height, width, FIGURE_WIDTH * MM, rng, 3, stretch=(wood.along, 1))
    field = ndimage.map_coordinates(source, bent, order=1, mode='reflect')
    return leaning(standard(field), wood.skew)


def buds(height, width, rng, wood):
    """Where the dormant buds of a burl sit and how deeply each marks the wood. They come
    in loose clusters and run into one another, so it takes rather more of them than the
    share they cover: as many as leave that share of a surface bare when scattered at
    random."""
    size = wood.eye * MM * UNIT
    count = round(-np.log(1 - wood.eyes) * height * width / (np.pi / 4 * size**2))
    found = []
    for cluster in range(0, count, 4):
        middle = rng.uniform(0, [height, width])
        for _ in range(min(4, count - cluster)):
            top, left = middle + rng.normal(0, 2.5 * size, 2)
            # A bud is round, give or take: what is drawn out are the whorls around it.
            across = size * rng.uniform(0.7, 1.3)
            down = across * rng.uniform(0.85, 1.18)
            found.append(([left, top, left + across, top + down], int(rng.integers(120, 256))))
    return found


def eyes(height, width, found):
    """What the buds leave: how much each darkens the wood, and where their wood swells.
    A bud's dark core sits inside the pale ring the grain parts into around it; the rings
    go down first and the cores are punched out of them, so two buds that touch make one
    mark, as a burl's do."""
    core, halo = (Image.new('L', (width, height), 0) for _ in range(2))
    cores, halos = ImageDraw.Draw(core), ImageDraw.Draw(halo)
    for box, _ in found:
        across, down = (box[2] - box[0]) / 2, (box[3] - box[1]) / 2
        halos.ellipse([box[0] - across, box[1] - down, box[2] + across, box[3] + down], fill=255)
    for box, depth in found:
        halos.ellipse(box, fill=0)
        cores.ellipse(box, fill=depth)
    # No two buds mark the wood as deeply, but the reference measured how deep one is on
    # average, so what is drawn spreads around that depth rather than under it.
    swell = np.asarray(core, np.float32) / np.mean([depth for _, depth in found])
    ring = np.asarray(halo, np.float32) / 255
    return ndimage.gaussian_filter(swell - 0.3 * ring, 0.5 * UNIT), swell


def plank(height, width, rng, wood):
    """A slab of wood as a standardised level, below zero at a year's dark end and above
    it in the pale wood. The lines and the pores take the share of the spread the
    references leave them, the broad figure the rest, and the eyes sit over both."""
    found = buds(height, width, rng, wood) if wood.eyes else []
    mark, swell = eyes(height, width, found) if found else (None, None)
    bent = winding(height, width, rng, wood)
    dark = LINE_GAIN * wood.depth * latewood(height, width, rng, wood)
    # Pores are a fifth of a millimetre across, far too small to draw one by one at a
    # board's size: what shows of them is the fine tooth of a cluster, lying along the
    # grain and winding with it. It is the fine grain that parts around a bud, by its own
    # width: the broad figure is several buds wide and runs straight past them.
    fine = (
        bent
        if swell is None
        else [
            side - aside
            for side, aside in zip(bent, parting(swell, wood.eye * MM * UNIT), strict=True)
        ]
    )
    cluster = np.clip(noise(height, width, 1.1, rng, stretch=(6, 1)) - 0.45, 0, 1)
    # The fibres the pores sit between, a third of a millimetre apart, which a board of
    # this many pixels can just carry: they do not darken the wood themselves, they say
    # where its pores show.
    cluster = cluster * (0.7 + 0.6 * noise(height, width, 0.5, rng, stretch=(12, 1)))
    dark = dark + PORE_GAIN * wood.pores * ndimage.map_coordinates(
        cluster, fine, order=1, mode='reflect'
    )
    # The two are drawn apart, so their spreads add in square.
    level = np.sqrt(1 - wood.bands**2) * -standard(dark)
    level = level + wood.bands * figure(height, width, rng, wood, bent)
    if mark is None:
        return level
    # The eyes take their own share of the spread in the same way, as deep as one is
    # measured to run, which leaves the grain the rest. A bird's eye maple's hold a tenth
    # of it, a vavona's a half.
    eyed = wood.bud * mark
    return np.sqrt(max(0.0, 1 - eyed.var())) * level - eyed


def toned(level, wood, stops):
    """The species' colors over `level`: the wood's own color where the level sits on
    average, reaching towards a year's dark end below it and towards the pale wood above,
    as far as it takes for the drawing's lightness to spread as the real board's does."""
    dark, middle, pale = (hex_color(stop) for stop in stops.split())
    gap = level[..., None]
    step = np.where(gap < 0, -gap * (dark - middle), gap * (pale - middle))
    target, reach, image = np.hypot(wood.spread, wood.tone), 0.5, None
    # L* bends and the colors run out of gamut, so the reach is stepped towards rather
    # than divided out once.
    for _ in range(6):
        image = np.clip(middle + step * reach, 0, 255)
        reach = min(MOST_REACH, reach * target / (lightness_star(image).std() + 1e-6))
    return image


def slab(name, rng):
    """The species under `name`, as a level over a slab of any size, centred on its own
    wood. Only centred: its spread is already one, the lines, the pores and the figure
    being drawn to a spread each, and the eyes stand as deep in it as the references
    measure them. Standardising here would divide them down by however many the wood
    holds, and a bird's eye maple would come out with no eyes to see."""
    wood = SPECIES[name]

    def draw(height, width):
        level = plank(height, width, rng, wood)
        return level - level.mean()

    return draw


def pieces(name, rng, turned=None):
    """The squares of one species, each cut from its own place of a slab twice the board's
    size and stepped to its own tone: no two pieces of a real board come from the same
    place of the same board, and a maker who sorts them does not sort them to match."""
    wood = SPECIES[name]
    share = np.hypot(wood.spread, wood.tone)
    level = cuts(slab(name, rng), rng, turned) * (wood.spread / share)
    tones = rng.normal(0, wood.tone / share, (8, 8))
    return toned(level + np.repeat(np.repeat(tones, SQUARE, 0), SQUARE, 1), wood, STOPS[name])


def board(light, dark):
    """A board of two species, the light squares' grain turned a quarter against the dark
    ones', as a real board's is."""

    def draw(rng):
        return compose(pieces(light, rng, lambda *_: True), pieces(dark, rng))

    return draw
