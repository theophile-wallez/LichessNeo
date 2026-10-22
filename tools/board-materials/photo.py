"""A board texture taken from photographs of one real board, square by square.

Only for photographs the project holds the rights to, and their license belongs in
public/licenses/ with the rest. Nothing of another chess site's may go in, redrawn or
traced or not: see the product rules in AGENTS.md. The materials with no board to
photograph are drawn from seeded noise instead (materials.py).

The chequerboard is its own calibration target. The corners where four squares meet are
found to sub-pixel accuracy, however few of them a photograph shows, and the perspective
and the lens are fitted to them together: that says where every square of the board lies
in every photograph, inside the frame or outside it. A square is never looked for by its
color, which would take the dark table a board stands on for a black square.

The board is then built from the sharpest copy of each square rather than from one
photograph: a photograph of the whole board gives all 64 squares but only about 160
pixels across each where a texture wants 256, and a close-up gives a dozen at up to 300.
The squares kept are spread over the whole range of how figured a square is, not simply
the largest, because the largest all come from the close-ups, which on a marble board
means the plainest squares and a texture with none of the slab's own variety.

The photographs disagree about exposure and about color -- the same stone reads L* 16 to
29 across the five of one board -- so each is first put on one scale, channel by channel,
by the pair its own squares give: a gain and an offset on light, which is a camera's
response and its veiling glare to first order, and all that two known shades can carry.

What is not the board is told from it by color and never by lightness, and in neither
direction in particular: the marble board stands on a wooden table, a saturated brown
against a near-neutral stone, and the wood boards on a grey cloth, neutral against a
saturated wood. So each square is held against the color of its own face of the board,
which the board itself gives.

  python3 tools/board-materials/photo.py <material> <photograph> [<photograph> …]
"""

import sys
import zlib
from pathlib import Path
from typing import NamedTuple

import cv2
import numpy as np
from focus import unblurred
from PIL import Image

from drawing import (
    BOARD,
    SQUARE,
    checker,
    from_light,
    mean_color,
    relief,
    spreads,
    to_light,
)
from rectify import biggest_grid, fitted

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/img/boards'
QUALITY = 92
LUMA = np.array([0.0722, 0.7152, 0.2126])  # OpenCV reads a photograph as blue, green, red

# How far inside its own borders a square is read, as a share of its width: the joint
# between two tiles sits there, and so does whatever the grid is out by.
INSET = 0.11
# How far past the corners it found a photograph is searched, in squares. A photograph of
# the whole board knows where the board ends; one of a corner of it does not.
REACH = 3
# Softens the ratio of two warmths where a face is all but neutral, since two readings
# near zero are a ratio of nothing, and how far a tile's warmth may then sit from its own
# face's, either way. Over the ten boards, the squares that are board sit within 1.7 of
# their face (the loosest being a white marble square so free of veins it is neutral
# against a face that is not quite), and the tiles that are the table start at 2.7: a
# patch of grey cloth reads a third of the maple it would pass for, and the dark wooden
# table under the marble eight times the stone.
STEADY = 0.1
APART = 2.0


class Face(NamedTuple):
    """One of the two surfaces a board alternates, as a photograph reads it."""

    level: float
    """Its median light."""
    warmth: float
    """How far its color runs from neutral, per unit of its own light: near zero for a
    marble, around one for a wood."""


def figured(tile):
    """How much more light a tile sends back than the darker half of its own pixels: what
    its veins or its figure add, and the one reading of them that no blur and no threshold
    can move. The squares of a real board differ widely in it -- one is a shattered mass of
    veins and the next nearly plain -- so it is what the harvest is spread over."""
    glow = to_light(tile) @ LUMA
    return float(glow.mean() / glow[glow <= np.median(glow)].mean() - 1)


def warmth(linear, glow):
    """How far a surface's color runs from neutral, per unit of its own light. Read off the
    darkest quarter of what it is given, which is the surface itself: a marble's gold veins
    and a varnish's highlights are warmer than the stone or the wood under them, and on a
    square shattered with veins they are most of its darker half."""
    dim = glow <= max(float(np.quantile(glow, 0.25)), 1e-6)
    darker = linear[dim]
    spread = np.abs(darker[:, 2] - darker[:, 1]) + np.abs(darker[:, 1] - darker[:, 0])
    return float(np.median(spread)) / max(float(np.median(glow[dim])), 1e-6)


def faced(color):
    """One of the two faces a board alternates, as a photograph reads its color."""
    level = float(color @ LUMA)
    spread = abs(color[2] - color[1]) + abs(color[1] - color[0])
    return Face(level, float(spread) / max(level, 1e-6))


def strange(linear, glow, face):
    """Whether a region's color is not this face's.

    A board and the table it stands on differ in how far from neutral they run, whichever
    way round: the marble board's table is a saturated wood where the stone is near
    neutral, and the wood boards' is a grey cloth where the wood is saturated. That is
    what tells the two apart, and lightness cannot be asked anything here -- a grey cloth
    and a pale maple sit at the same level.
    """
    off = (warmth(linear, glow) + STEADY) / (face.warmth + STEADY)
    return abs(np.log(off)) > np.log(APART)


def bordered(linear, glow, face, foreign):
    """Whether every part of a tile's border is the board and not what it stands on. Read
    in blocks and then in the thinnest sliver of all, because the joint between two tiles
    shows as a line three pixels wide, which is nothing of a block and a third of a
    sliver."""
    edge = round(0.14 * len(glow))
    for across in range(4):
        for down in range(4):
            if 0 < across < 3 and 0 < down < 3:
                continue
            top, left = down * (len(glow) - edge) // 3, across * (len(glow) - edge) // 3
            at = (slice(top, top + edge), slice(left, left + edge))
            if foreign(glow[at]) > 0.35 or strange(linear[at], glow[at], face):
                return False
    thin = round(0.04 * len(glow))
    slivers = (
        (slice(None, thin),),
        (slice(-thin, None),),
        (slice(None), slice(None, thin)),
        (slice(None), slice(-thin, None)),
    )
    return all(foreign(glow[at]) < 0.38 for at in slivers)


def whole(tile, face, other):
    """Whether a tile is a square of this face of the board and nothing else.

    A square taken partly off the board holds a stretch of the face next to it, of the
    board's own rim, or of the table; and a grid fitted to a corner of the board cannot
    know where the board ends, so the tile itself is the only place left to look. Four
    things are asked of it: that it sits at its own face's level, that its color is that
    face's, that little of it is the other face, and that no part of its border is either.

    What is looked for is the other face and not merely a brighter or darker patch: a vein
    or a growth ring crossing a square's edge is no stranger there, and a test on
    brightness alone throws out every square that has one.
    """
    linear = to_light(tile)
    glow = linear @ LUMA
    middle = max(float(np.median(glow)), 1e-6)
    darker = other < face.level
    # Measured most of the way towards the other face, since a vein of this one reaches
    # well past halfway and is not foreign at all.
    step = float(np.exp(0.75 * np.log(max(other, 1e-6)) + 0.25 * np.log(max(face.level, 1e-6))))

    def foreign(shine):
        """The share of a region that is the board's other face."""
        return float((shine < step).mean() if darker else (shine > step).mean())

    if foreign(glow) > 0.2 or abs(np.log(middle / max(face.level, 1e-6))) > 0.5:
        return False
    if strange(linear, glow, face):
        return False
    return bordered(linear, glow, face, foreign)


def spanned(corners):
    """Which squares to look for along an axis, given how many inner corners were found
    along it. Seven is all a board has, so that axis is pinned to the board's own edges and
    nothing past them is looked at; fewer leaves the board's end unknown, and the squares
    past the corners are searched and tested instead. It is worth the care: a square placed
    a little off the board's end carries the rim's bevel, which sits between the two faces
    in lightness and is of the board's own wood, so no test on color or level sees it."""
    return (0, 8) if corners == 7 else (-REACH, corners + 1 + REACH)


def squared(photo, place, rows, columns):
    """Every square of the board this photograph holds whole: its place's parity, its four
    corners, how many pixels across it is, and what level and color it sits at."""
    height, width = photo.shape[:2]
    linear = to_light(photo)
    glow = linear @ LUMA
    down, across = (spanned(rows), spanned(columns))
    found = []
    for row in range(*down):
        for column in range(*across):
            quad = place(
                [[column, row], [column + 1, row], [column + 1, row + 1], [column, row + 1]]
            )
            inside = (quad >= 8).all() and (quad[:, 0] < width - 8).all()
            if not inside or not (quad[:, 1] < height - 8).all():
                continue
            mask = np.zeros(glow.shape, np.uint8)
            cv2.fillConvexPoly(mask, quad.astype(np.int32), 1)
            seen = cv2.erode(mask, np.ones((9, 9), np.uint8)) > 0
            if seen.sum() < 400:
                continue
            sides = np.hypot(*(quad - np.roll(quad, 1, axis=0)).T)
            # The median and not the mean: a square's bright veins are a long tail, and a
            # mean read here would be held against a median read on its tile later.
            found.append(
                (
                    (row + column) % 2,
                    quad,
                    float(sides.mean()),
                    float(np.median(glow[seen])),
                    np.median(linear[seen], axis=0),
                )
            )
    return found


def levelled(found, place, rows, columns):
    """The board's two own colors in a photograph, read only off the squares the corners
    it found enclose, which are certainly board and not table, and which of the two
    parities is the darker face."""
    near, far = place([[1, 1]])[0], place([[columns, rows]])[0]
    sure = [
        (parity, shine, tint)
        for parity, quad, _, shine, tint in found
        if (quad.min(axis=0) >= near - 1).all() and (quad.max(axis=0) <= far + 1).all()
    ] or [(parity, shine, tint) for parity, _, _, shine, tint in found]
    levels = {
        parity: float(np.median([shine for own, shine, _ in sure if own == parity]))
        for parity in (0, 1)
    }
    tints = {
        parity: np.median([tint for own, _, tint in sure if own == parity], axis=0)
        for parity in (0, 1)
    }
    if any(np.isnan(level) for level in levels.values()):
        return None
    darker = min(levels, key=levels.get)
    return {True: tints[darker], False: tints[1 - darker]}, darker


def harvested(paths):
    """Every square of the board the photographs hold whole, as tiles one square across,
    all on the first photograph's own scale."""
    harvest = {False: [], True: []}
    reference = None
    for path in paths:
        photo = cv2.imread(str(path))
        if photo is None:
            raise SystemExit(f'cannot read {path}')
        grid = biggest_grid(cv2.cvtColor(photo, cv2.COLOR_BGR2GRAY))
        if not grid:
            print(f'{Path(path).name}: no chequerboard found, left out')
            continue
        rows, columns, corners = grid
        place, apart = fitted(corners, rows, columns)
        across = float(np.median(np.hypot(*(corners[:, 1:] - corners[:, :-1]).reshape(-1, 2).T)))
        if apart > 0.04 * across:
            print(
                f'{Path(path).name}: its corners sit {apart:.0f} px off a flat board '
                f'{across:.0f} px to a square, too far to trust, left out'
            )
            continue
        # Its own blur comes off before anything is read off it or cut out of it, measured
        # on the square boundaries themselves (focus.py). A square is only 50 to 300 pixels
        # across in these photographs where a texture wants 256, so the blur is the whole
        # difference between a grain one can see and a smudge.
        lit, blur, sharp = unblurred(to_light(photo), place, rows, columns, LUMA)
        found = squared(np.clip(from_light(lit), 0, 255).astype(np.uint8), place, rows, columns)
        read = levelled(found, place, rows, columns) if found else None
        if not read:
            print(f'{Path(path).name}: only one face of the board in frame, left out')
            continue
        casts, darker = read
        if reference is None:
            reference, gain, offset = casts, np.ones(3), np.zeros(3)
        else:
            gain = (reference[True] - reference[False]) / (casts[True] - casts[False])
            offset = reference[False] - gain * casts[False]
            if not ((gain > 0.4) & (gain < 2.5)).all():
                print(
                    f'{Path(path).name}: its two faces read {casts[False].round(3)} and '
                    f'{casts[True].round(3)}, which no exposure explains, left out'
                )
                continue
        evened = np.clip(from_light(lit * gain + offset), 0, 255).astype(np.uint8)
        # The faces as the evened photograph shows them, not as it was shot: the tiles a
        # square is tested against come out of `evened`, so the two must be on one scale.
        faces = {dark: faced(gain * casts[dark] + offset) for dark in (False, True)}
        target = np.array([[0, 0], [SQUARE, 0], [SQUARE, SQUARE], [0, SQUARE]], np.float32)
        kept = 0
        for parity, quad, side, _, _ in found:
            source = (quad + INSET * (quad.mean(axis=0) - quad)).astype(np.float32)
            tile = cv2.warpPerspective(
                evened,
                cv2.getPerspectiveTransform(source, target),
                (SQUARE, SQUARE),
                flags=cv2.INTER_LANCZOS4,
            )
            dark = parity == darker
            if not whole(tile, faces[dark], faces[not dark].level):
                continue
            harvest[dark].append((side, figured(tile), tile))
            kept += 1
        print(
            f'{Path(path).name}: {rows}×{columns} corners to {apart:.1f} px, {kept} of '
            f'{len(found)} squares kept whole, {across:.0f} px across, its channels '
            f'×{np.round(gain, 2)} {np.round(offset, 3)}, its square boundaries '
            + (f'{blur:.2f} px wide, {sharp:.2f} once unblurred' if blur else 'too few to read')
        )
    return harvest


def chosen(tiles, wanted):
    """`wanted` tiles that keep the board's own spread of figure, each the best resolved of
    its own kind: the harvest is sorted by how figured a square is and cut into that many
    equal bands, and the largest square in each band is taken. Taking the largest overall
    instead gives whichever squares the close-ups happened to show, which on a marble
    board means a texture of plain ones."""
    if not tiles:
        raise SystemExit('no squares harvested')
    ranked = sorted(tiles, key=lambda tile: tile[1])
    bands = np.array_split(np.arange(len(ranked)), min(wanted, len(ranked)))
    kept = [max((ranked[i] for i in band), key=lambda tile: tile[0]) for band in bands]
    while len(kept) < wanted:
        kept.append(kept[len(kept) % len(bands)])
    return kept


def laid(harvest, rng):
    """The tiles laid out as a board, each turned any quarter: that is how the makers lay
    the real ones, whose squares are cut across the sheet as much as along it, and it keeps
    a square used twice on a board of 64 from reading as the same square twice."""
    board = np.zeros((BOARD, BOARD, 3), np.uint8)
    chosen_tiles = {dark: chosen(harvest[dark], 32) for dark in (False, True)}
    for dark in (False, True):
        sides = np.array([side for side, _, _ in chosen_tiles[dark]])
        marks = np.array([mark for _, mark, _ in chosen_tiles[dark]])
        print(
            f'  {"dark" if dark else "light"} squares: {len(harvest[dark])} harvested, 32 '
            f'kept over the whole spread of figure ({marks.min():+.0%} to {marks.max():+.0%}, '
            f'{marks.mean():+.0%} on average), {sides.min():.0f} to {sides.max():.0f} px '
            f'across where a texture wants {SQUARE}'
        )
    order = {dark: rng.permutation(32) for dark in (False, True)}
    used = {False: 0, True: 0}
    for row in range(8):
        for column in range(8):
            dark = (row + column) % 2 == 1
            tile = chosen_tiles[dark][order[dark][used[dark] % 32]][2]
            used[dark] += 1
            turned = np.rot90(tile, rng.integers(4))
            board[row * SQUARE : (row + 1) * SQUARE, column * SQUARE : (column + 1) * SQUARE] = (
                turned
            )
    return board[..., ::-1].astype(float)


def main(name, paths):
    OUT.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(zlib.crc32(name.encode()))
    image = laid(harvested(paths), rng)
    Image.fromarray(relief(image), 'RGB').save(OUT / f'{name}.webp', quality=QUALITY)
    dark = checker()
    print(
        f'{name}: light {mean_color(image, ~dark)} spread {spreads(image, False)}, '
        f'dark {mean_color(image, dark)} spread {spreads(image, True)}'
    )
    print(f'{BOARD}px texture in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__.strip().splitlines()[-1].strip())
    main(sys.argv[1], sys.argv[2:])
