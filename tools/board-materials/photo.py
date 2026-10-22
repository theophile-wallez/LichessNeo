"""A board texture taken from photographs of one real board, square by square.

Only for photographs the project holds the rights to, and their license belongs in
public/licenses/ with the rest. Nothing of another chess site's may go in, redrawn or
traced or not: see the product rules in AGENTS.md. The other textures are drawn from
seeded noise (materials.py), which is what a material without such photographs gets.

The chequerboard is its own calibration target. The corners where four squares meet are
found to sub-pixel accuracy, however few of them a photograph shows, and the perspective
and the lens are fitted to them together: that says where every square of the board lies
in every photograph, inside the frame or outside it. A square is never looked for by its
color, which would take the dark table a board stands on for a black square.

The board is then built from the sharpest copy of each square rather than from one
photograph: a photograph of the whole board gives all 64 squares but only about 160
pixels across each where a texture wants 256, and a close-up gives a dozen at up to 300.
The squares kept are spread over the whole range of how veined a square is, not simply
the largest, because the largest all come from the close-ups, which on a marble board
means the plainest squares and a texture with none of the slab's own variety.

The photographs disagree about exposure and about color -- the same stone reads L* 16 to
29 across the five of one board -- so each is first put on one scale, channel by channel,
by the pair its own squares give: a gain and an offset on light, which is a camera's
response and its veiling glare to first order, and all that two known shades can carry.

  python3 tools/board-materials/photo.py <material> <photograph> [<photograph> …]
"""

import sys
import zlib
from pathlib import Path

import cv2
import numpy as np
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


def biggest_grid(grey):
    """The largest grid of inner corners a photograph shows, and its shape. A whole board
    gives 7 by 7 of them; a close-up of a corner gives whatever it gives."""
    for rows in range(7, 2, -1):
        for columns in range(7, 2, -1):
            ok, corners = cv2.findChessboardCornersSB(
                grey, (columns, rows), flags=cv2.CALIB_CB_EXHAUSTIVE
            )
            if ok:
                return rows, columns, corners.reshape(rows, columns, 2).astype(np.float64)
    return None


def terms(points):
    """A point's quadratic terms, which is the shape a lens bends a straight line into."""
    return np.c_[
        np.ones(len(points)),
        points[:, 0],
        points[:, 1],
        points[:, 0] ** 2,
        points[:, 0] * points[:, 1],
        points[:, 1] ** 2,
    ]


def fitted(corners, rows, columns):
    """Where a point of the board lies in a photograph, as a function of its place in
    squares, and how far that function misses the corners it was fitted to. The
    homography is the perspective exactly; the quadratic on top of it is the lens. Both
    are fitted to every corner at once, so a corner found on the wrong side of a vein
    moves the surface by a fraction of itself instead of tearing a square out of line."""
    places = np.array(
        [[column + 1, row + 1] for row in range(rows) for column in range(columns)], float
    )
    found = corners.reshape(-1, 2)
    matrix, agreed = cv2.findHomography(places, found, cv2.RANSAC, 4.0)
    if agreed is not None and agreed.sum() >= 8:
        held = agreed.ravel() > 0
        matrix, _ = cv2.findHomography(places[held], found[held], 0)
    straight = cv2.perspectiveTransform(places.reshape(1, -1, 2), matrix).reshape(-1, 2)
    # Six terms an axis need corners to spare, or the lens model bends to whatever a
    # mis-found corner says: a photograph showing only a dozen gets the perspective alone.
    bend = (
        np.linalg.lstsq(terms(places), found - straight, rcond=None)[0]
        if len(places) >= 30
        else np.zeros((6, 2))
    )

    def place(points):
        points = np.asarray(points, float)
        flat = cv2.perspectiveTransform(points.reshape(1, -1, 2), matrix).reshape(-1, 2)
        return flat + terms(points) @ bend

    return place, float(np.median(np.hypot(*(place(places) - found).T)))


def veined(tile):
    """How much more light a tile sends back than the darker half of its own pixels: what
    its veins add, and the one reading of a vein that no blur and no threshold can move.
    The squares of a real slab differ widely in it -- one is shattered and the next nearly
    plain -- so it is what the harvest is spread over."""
    glow = to_light(tile) @ LUMA
    return float(glow.mean() / glow[glow <= np.median(glow)].mean() - 1)


def foreign(glow, between, darker):
    """The share of `glow` that is the other of the board's two marbles."""
    return float((glow < between).mean() if darker else (glow > between).mean())


def whole(tile, level, other):
    """Whether a tile is a square of this stone and nothing else.

    A square taken partly off the board holds a stretch of the stone next to it, of the
    slab's own rim, or of the table; and a grid fitted to a corner of the board cannot
    know where the board ends, so the tile itself is the only place left to look. Three
    things are asked of it: that it sits at its own stone's level, that little of it is
    the other stone, and that no part of its border is. The border is read in blocks and
    then in the thinnest sliver of all, because the joint between two tiles shows as a
    line three pixels wide, which is nothing of a block and a third of a sliver.

    What is looked for is the other stone and not merely a brighter or darker patch: a
    vein crossing a square's edge is no stranger there, and a test on brightness alone
    throws out every square that has one.
    """
    linear = to_light(tile)
    glow = linear @ LUMA
    middle = max(float(np.median(glow)), 1e-6)
    darker = other < level
    # Measured most of the way towards the other stone, since a vein of this one reaches
    # well past halfway and is not foreign at all.
    between = float(np.exp(0.75 * np.log(max(other, 1e-6)) + 0.25 * np.log(max(level, 1e-6))))
    if foreign(glow, between, darker) > 0.2 or abs(np.log(middle / max(level, 1e-6))) > 0.5:
        return False
    # How warm the stone itself runs, off the darker half of the tile so its own gold
    # veins stay out of it: a wooden table is a saturated brown through and through, where
    # a marble is near neutral.
    stone = linear[glow <= middle]
    spread = np.abs(stone[:, 2] - stone[:, 1]) + np.abs(stone[:, 1] - stone[:, 0])
    if float(np.median(spread)) / max(float(np.median(glow[glow <= middle])), 1e-6) > 0.5:
        return False
    edge = round(0.14 * len(glow))
    for across in range(4):
        for down in range(4):
            if 0 < across < 3 and 0 < down < 3:
                continue
            top, left = down * (len(glow) - edge) // 3, across * (len(glow) - edge) // 3
            block = glow[top : top + edge, left : left + edge]
            if foreign(block, between, darker) > 0.35:
                return False
    thin = round(0.04 * len(glow))
    slivers = (glow[:thin], glow[-thin:], glow[:, :thin], glow[:, -thin:])
    return all(foreign(sliver, between, darker) < 0.38 for sliver in slivers)


def squared(photo, place, rows, columns):
    """Every square of the board this photograph holds whole: its place's parity, its four
    corners, how many pixels across it is, and what level and color it sits at."""
    height, width = photo.shape[:2]
    linear = to_light(photo)
    glow = linear @ LUMA
    span = (0, 8) if rows == columns == 7 else (-REACH, rows + 1 + REACH)
    found = []
    for row in range(*span):
        for column in range(*span):
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
    """The two stones' own colors in a photograph, read only off the squares the corners
    it found enclose, which are certainly board and not table, and which of the two
    parities is the darker stone."""
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
        found = squared(photo, place, rows, columns)
        read = levelled(found, place, rows, columns) if found else None
        if not read:
            print(f'{Path(path).name}: only one stone in frame, left out')
            continue
        casts, darker = read
        if reference is None:
            reference, gain, offset = casts, np.ones(3), np.zeros(3)
        else:
            gain = (reference[True] - reference[False]) / (casts[True] - casts[False])
            offset = reference[False] - gain * casts[False]
            if not ((gain > 0.4) & (gain < 2.5)).all():
                print(
                    f'{Path(path).name}: its two stones read {casts[False].round(3)} and '
                    f'{casts[True].round(3)}, which no exposure explains, left out'
                )
                continue
        evened = np.clip(from_light(to_light(photo) * gain + offset), 0, 255).astype(np.uint8)
        levels = {dark: float(casts[dark] @ LUMA) for dark in (False, True)}
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
            if not whole(tile, levels[dark], levels[not dark]):
                continue
            harvest[dark].append((side, veined(tile), tile))
            kept += 1
        print(
            f'{Path(path).name}: {rows}×{columns} corners to {apart:.1f} px, {kept} of '
            f'{len(found)} squares kept whole, {across:.0f} px across, its channels '
            f'×{np.round(gain, 2)} {np.round(offset, 3)}'
        )
    return harvest


def chosen(tiles, wanted):
    """`wanted` tiles that keep the slab's own spread of veining, each the best resolved of
    its own kind: the harvest is sorted by how veined a square is and cut into that many
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
    """The tiles laid out as a board, each turned any quarter: a slab is cut without a
    grain, so that is how a real board is laid, and it keeps a square used twice on a
    board of 64 from reading as the same square twice."""
    board = np.zeros((BOARD, BOARD, 3), np.uint8)
    chosen_tiles = {dark: chosen(harvest[dark], 32) for dark in (False, True)}
    for dark in (False, True):
        sides = np.array([side for side, _, _ in chosen_tiles[dark]])
        veins = np.array([vein for _, vein, _ in chosen_tiles[dark]])
        print(
            f'  {"dark" if dark else "light"} squares: {len(harvest[dark])} harvested, 32 '
            f'kept over the whole spread of veining ({veins.min():+.0%} to {veins.max():+.0%}, '
            f'{veins.mean():+.0%} on average), {sides.min():.0f} to {sides.max():.0f} px '
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
