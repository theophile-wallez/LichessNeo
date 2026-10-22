"""A board photograph enlarged four times, by Stability's fast upscaler on Bedrock.

What the real limit is: a square is 50 to 230 pixels across in these photographs where a
texture wants 256, and that, not the blur, is what holds them back. focus.py already takes
each photograph's own blur off and stops where its evidence stops; there is nothing more to
recover. Enlarged four times first, every square reaches the 256 photo.py cuts it to, and
the whole pipeline after this runs unchanged, on a larger photograph.

What it costs: the model does not recover grain, it draws plausible grain of about the
right density. Measured against a known-sharp square cut to a quarter and put back, it
restores the right amount of fine detail and in the wrong places -- the right quantity, a
worse likeness than plain Lanczos. So a square keeps the board's own shape, color and
figure, at the board's own scale, and its finest grain is the model's. Worth knowing before
calling these squares a photograph of anything.

The upscaler sends back 16 MB at most, which a lossless four-times PNG of much more than a
third of a megapixel overruns, so a photograph goes up in overlapping tiles and comes back
cross-faded. Each tile invents its own grain, so a hard seam would read as a line across
the board; the fade spreads the disagreement over a band instead, and the band is kept
narrow because it reads a little softer than the rest.

Needs AWS_BEARER_TOKEN_BEDROCK. The Stability models are in no European region and none of
them can be invoked on demand, hence the us-east-1 inference profile below. Every tile is
billed, so a photograph already enlarged is left alone and a stopped run resumes.

  python3 tools/board-materials/upscale.py <folder> <photograph> [<photograph> …]
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

import cv2
import numpy as np

MODEL = 'us.stability.stable-fast-upscale-v1:0'
REGION = 'us-east-1'
SCALE = 4
# How large a tile may be, in pixels of the photograph, and how much of itself a tile
# shares with each neighbour: 48 is about a square's width at these resolutions.
TILE = 360_000
OVERLAP = 48


def upscaled(patch):
    """One patch of a photograph, four times as wide and as tall."""
    ok, encoded = cv2.imencode('.png', patch)
    if not ok:
        raise SystemExit('cannot encode a tile')
    request = urllib.request.Request(
        f'https://bedrock-runtime.{REGION}.amazonaws.com/model/{MODEL}/invoke',
        data=json.dumps(
            {'image': base64.b64encode(encoded.tobytes()).decode(), 'output_format': 'png'}
        ).encode(),
        headers={
            'Authorization': f'Bearer {os.environ["AWS_BEARER_TOKEN_BEDROCK"]}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as answer:
            back = json.loads(answer.read())
    except urllib.error.HTTPError as refused:
        raise SystemExit(f'{refused.code}: {refused.read().decode()[:500]}') from None
    if 'images' not in back:
        raise SystemExit(f'nothing came back: {json.dumps(back)[:400]}')
    raw = np.frombuffer(base64.b64decode(back['images'][0]), np.uint8)
    return cv2.imdecode(raw, cv2.IMREAD_COLOR)


def tiling(height, width):
    """How many tiles across and down, the fewest that each stay under the size the
    upscaler can answer with, and as square as that allows."""
    columns, rows = 1, 1
    while (height / rows) * (width / columns) > TILE:
        if width / columns > height / rows:
            columns += 1
        else:
            rows += 1
    return columns, rows


def cuts(length, pieces):
    """Where each tile starts and ends along one axis, overlapping its neighbours."""
    if pieces == 1:
        return [(0, length)]
    step = (length - OVERLAP) / pieces
    return [
        (max(0, round(i * step) - OVERLAP // 2), min(length, round((i + 1) * step) + OVERLAP))
        for i in range(pieces)
    ]


def feather(piece, at, shape):
    """How much a tile's own pixels count where it meets its neighbours: its full weight in
    the middle, fading to nothing over the overlap at every edge that is not the
    photograph's own, which keeps its full weight to the end."""
    (top, bottom), (left, right) = at
    fade = OVERLAP * SCALE
    ramp = np.linspace(0.0, 1.0, fade + 2)[1:-1]
    down, across = np.ones(piece.shape[0]), np.ones(piece.shape[1])
    if top > 0:
        down[:fade] = ramp
    if bottom < shape[0]:
        down[-fade:] = ramp[::-1]
    if left > 0:
        across[:fade] = ramp
    if right < shape[1]:
        across[-fade:] = ramp[::-1]
    return np.outer(down, across)[:, :, None]


def enlarged(photo):
    """A whole photograph four times as large, tile by tile, the overlaps cross-faded."""
    height, width = photo.shape[:2]
    columns, rows = tiling(height, width)
    print(f'  {width}×{height}, {height * width / 1e6:.2f} MP, {columns}×{rows} tiles')
    canvas = np.zeros((height * SCALE, width * SCALE, 3), float)
    weight = np.zeros((height * SCALE, width * SCALE, 1), float)
    for top, bottom in cuts(height, rows):
        for left, right in cuts(width, columns):
            piece = upscaled(photo[top:bottom, left:right])
            wanted = ((right - left) * SCALE, (bottom - top) * SCALE)
            if piece.shape[1::-1] != wanted:
                piece = cv2.resize(piece, wanted, interpolation=cv2.INTER_LANCZOS4)
            share = feather(piece, ((top, bottom), (left, right)), (height, width))
            at = (
                slice(top * SCALE, top * SCALE + piece.shape[0]),
                slice(left * SCALE, left * SCALE + piece.shape[1]),
            )
            canvas[at] += piece.astype(float) * share
            weight[at] += share
    return np.clip(canvas / np.maximum(weight, 1e-6), 0, 255).astype(np.uint8)


def main(folder, paths):
    Path(folder).mkdir(parents=True, exist_ok=True)
    for path in paths:
        # Kept as PNG whatever came in: a JPEG round trip here would undo the detail the
        # upscaler just drew, and photo.py reads these once and throws them away.
        target = Path(folder) / f'{Path(path).stem}.png'
        if target.exists():
            print(f'{Path(path).name}: already enlarged, left alone')
            continue
        photo = cv2.imread(str(path))
        if photo is None:
            raise SystemExit(f'cannot read {path}')
        print(f'{Path(path).name}:')
        larger = enlarged(photo)
        cv2.imwrite(str(target), larger)
        print(f'  {larger.shape[1]}×{larger.shape[0]} in {target}')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__.strip().splitlines()[-1].strip())
    main(sys.argv[1], sys.argv[2:])
