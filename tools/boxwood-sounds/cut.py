"""Cuts the Boxwood sound set, public/sounds/boxwood/<name>-<n>.ogg, out of
recording.mp3, the author's own microphone recording of wooden pieces on a board: each take is a gesture
of the recording, picked by ear and by its spectrum (the lists below, in
seconds), then evened in loudness so no take stands out, and encoded as Opus.

Run it again after changing a take. Needs ffmpeg, numpy and scipy.

  python3 tools/boxwood-sounds/cut.py tools/boxwood-sounds/recording.mp3

Each sound's number of takes is in RECORDED_TAKES (src/shared/recorded-sounds.ts):
the build fails if the folder doesn't match it.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile

OUT = Path(__file__).resolve().parents[2] / 'public/sounds/boxwood'
BITRATE = '128k'
RATE = 48000
PRE_ROLL = 0.012
FADE_IN = 0.002
FADE_OUT = 0.05
PEAK_LIMIT_DB = -1.0

# Each take: where it starts (a capture's first touch, a castle's king), the
# hit its loudness is measured on, and how long it rings after that hit.
# Poses: a piece set down. Self and opponent split on brightness, the
# opponent's duller, as if farther; checks are the firmest poses.
POSES_SELF = [14.626, 15.536, 55.871, 58.991, 68.168, 70.953]
POSES_OPPONENT = [8.388, 22.906, 30.920, 37.761, 72.002, 75.486]
POSES_CHECK = [5.493, 6.972, 57.550]
# A knight, which jumps: a pose whose piece rocks back once, 110 to 270 ms
# after landing, kept to just past that rebound. (pose, rebound)
KNIGHTS = [
    (14.626, 14.820),
    (58.991, 59.197),
    (62.633, 62.745),
    (69.240, 69.406),
    (72.002, 72.187),
    (6.972, 7.243),
]
REBOUND_RING = 0.12
# A light touch, then the bright knock of piece on piece.
CAPTURE_RING = 0.28
CAPTURES = [
    (9.855, 10.008),
    (16.256, 16.353),
    (19.628, 19.765),
    (29.531, 29.690),
    (37.082, 37.249),
    (42.028, 42.189),
    (52.948, 53.047),
    (76.695, 76.793),
]
# A capture that gives check is slammed: the hardest knocks, louder, ringing longer.
# The hardest of all is the mate's own, left to it.
SLAMS = [(29.531, 29.690), (52.948, 53.047)]
SLAM_RING = 0.4
# A mate: the hardest slam, after which a piece knocked over rocks still,
# a dozen ever closer knocks over a second. (touch, slam, still)
MATE = (19.600, 19.765, 21.100)
# Two poses a quarter second apart: the king, then the rook.
CASTLES = [(12.165, 12.404), (12.899, 13.148), (63.776, 64.047), (74.096, 74.391)]
TAPS = [21.718, 66.880, 42.668]
# Slides, a piece dragged across the board, each the whole gesture. A long
# move plays the middle of one, the piece in full course, faded at both ends,
# as long as the move is far: SHORTEST for two squares, LONGEST for seven.
# Leaving out its start also hides the ones that swell slowly.
SLIDES = [
    (1.12, 1.87),
    (2.82, 3.64),
    (10.77, 11.51),
    (23.81, 24.44),
    (27.34, 27.93),
    (31.90, 32.44),
    (33.68, 34.33),
    (35.34, 35.69),
    (40.75, 41.62),
    (43.77, 44.28),
    (45.61, 45.92),
    (46.78, 47.25),
    (48.27, 48.76),
    (49.63, 50.06),
    (51.20, 51.58),
    (59.80, 60.29),
    (64.55, 64.90),
    (65.94, 66.45),
    (69.92, 70.22),
    (72.75, 73.06),
]
SHORTEST = 0.20
LONGEST = 0.60
REACHES = range(2, 8)
TAKES_PER_REACH = 3
MIDDLE_FADE_OUT = 0.08
# The knock a slide ends on when it takes: a capture's, without its first touch.
KNOCKS = [10.008, 16.353, 19.765, 29.690, 37.249, 42.189, 53.047, 76.793]
# A promotion: the pawn's step, the end of a short slide, ending on a soft,
# dull pose; then, once the pawn is taken off, the new piece set down firmly,
# a check's pose.
PAWN_STEP = 0.13
# Only the step's end is heard, so a slide that swells slowly will do.
PROMOTIONS = [(45.61, 45.92), (69.92, 70.22), (72.75, 73.06), (64.55, 64.90)]
PAWN_POSES = [8.388, 22.906, 30.920, 37.761]
PAWN_LOUDNESS = -24
# From the pawn's take ending to the new piece's pose.
NEW_PIECE_GAP = 0.30
# A promotion that captures: the pawn's whole capture, then the new piece.
PROMOTION_CAPTURES = CAPTURES[::2]

# Loudness of each kind, in dBFS RMS over its hit's first 60 ms.
LOUDNESS = {
    'move-self': -21,
    'move-opponent': -21,
    'move-knight': -21,
    'move-check': -19,
    'capture': -22,
    'capture-check': -18,
    'checkmate': -18,
    'castle': -21,
    'premove': -27,
    'move-slide': -42,
}
SLIDE_FADE_IN = 0.03
# The knock lands this long before the slide's end, over its fade.
KNOCK_OVERLAP = 0.05


def takes():
    """Every take as (sound, start, hit, ring)."""
    for name, poses in (
        ('move-self', POSES_SELF),
        ('move-opponent', POSES_OPPONENT),
        ('move-check', POSES_CHECK),
    ):
        for hit in poses:
            yield name, hit, hit, 0.2
    for pose, rebound in KNIGHTS:
        yield 'move-knight', pose, pose, rebound - pose + REBOUND_RING
    for touch, hit in CAPTURES:
        yield 'capture', touch, hit, CAPTURE_RING
    for touch, hit in SLAMS:
        yield 'capture-check', touch, hit, SLAM_RING
    touch, slam, still = MATE
    yield 'checkmate', touch, slam, still - slam
    for king, rook in CASTLES:
        yield 'castle', king, rook, 0.2
    for hit in TAPS:
        yield 'premove', hit, hit, 0.15


def decode(mp3):
    """The recording as float samples, stereo, at RATE."""
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / 'recording.wav'
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-i', mp3, '-ar', str(RATE), '-c:a', 'pcm_f32le', str(wav)],
            check=True,
        )
        _, samples = wavfile.read(wav)
    return samples.astype(np.float64)


def fade(take, fade_in):
    """Fades `take` in over `fade_in` seconds and out over FADE_OUT, in place."""
    count = int(fade_in * RATE)
    take[:count] *= np.linspace(0, 1, count)[:, None]
    count = int(FADE_OUT * RATE)
    take[-count:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, count)))[:, None]
    return take


def leveled(take, loudness, body):
    """`take` set to `loudness` in dBFS RMS, measured over `body`."""
    return take * 10 ** ((loudness - 20 * np.log10(np.sqrt((body**2).mean()))) / 20)


def limited(take):
    """`take`, its peak kept under the limit."""
    limit = 10 ** (PEAK_LIMIT_DB / 20)
    return take * min(1, limit / np.abs(take).max())


def to_pcm(take):
    """`take` as 16-bit samples, its peak kept under the limit."""
    return (np.clip(limited(take), -1, 1) * 32767).astype(np.int16)


def cut(samples, start, hit, ring, loudness):
    """One take, faded at both ends and set to `loudness` over its hit's first 60 ms."""
    begin = start - PRE_ROLL
    take = fade(samples[int(begin * RATE) : int((hit + ring) * RATE)].copy(), FADE_IN)
    at = int((hit - begin) * RATE)
    return leveled(take, loudness, take[max(0, at - int(0.005 * RATE)) : at + int(0.06 * RATE)])


def slide_take(samples, start, end, fade_out=None):
    """The slide from `start` to `end`, faded in and leveled; `fade_out` eases out a cut one."""
    raw = samples[int((start - 0.02) * RATE) : int((end + 0.03) * RATE)].copy()
    slide = fade(raw, SLIDE_FADE_IN)
    if fade_out:
        count = int(fade_out * RATE)
        slide[-count:] *= np.linspace(1, 0, count)[:, None] ** 2
    return leveled(slide, LOUDNESS['move-slide'], slide)


def hit_take(samples, at, ring, loudness):
    """The hit at `at`, ringing for `ring`, leveled over its first 60 ms."""
    hit = fade(samples[int((at - PRE_ROLL) * RATE) : int((at + ring) * RATE)].copy(), FADE_IN)
    return leveled(hit, loudness, hit[int(0.007 * RATE) : int(0.072 * RATE)])


def ending_on(slide, hit):
    """`slide`, then `hit` landing over its fade."""
    land = len(slide) - int(KNOCK_OVERLAP * RATE)
    both = np.zeros((land + len(hit), 2))
    both[: len(slide)] += slide
    both[land:] += hit
    return both


def slide_cuts(samples):
    """For each reach, shortest first, TAKES_PER_REACH slides long enough for it, cut to its length."""
    for reach in REACHES:
        length = SHORTEST + (LONGEST - SHORTEST) * (reach - REACHES[0]) / (len(REACHES) - 1)
        long_enough = [(start, end) for start, end in SLIDES if end - start >= length]
        for i in range(TAKES_PER_REACH):
            start, end = long_enough[(reach * TAKES_PER_REACH + i) % len(long_enough)]
            middle = (start + end) / 2
            yield slide_take(samples, middle - length / 2, middle + length / 2, MIDDLE_FADE_OUT)


def slides(samples):
    """Each slide alone, then ending on what a capture or a check adds."""
    for k, slide in enumerate(slide_cuts(samples)):
        yield 'move-slide', to_pcm(slide)
        knock = hit_take(samples, KNOCKS[k % len(KNOCKS)], CAPTURE_RING, LOUDNESS['capture'])
        yield 'capture-slide', to_pcm(ending_on(slide, knock))
        # A slide has nothing to slam: one that checks ends on a check's firm pose.
        pose = hit_take(samples, POSES_CHECK[k % len(POSES_CHECK)], 0.2, LOUDNESS['move-check'])
        yield 'move-slide-check', to_pcm(ending_on(slide, pose))
        _, hit = SLAMS[k % len(SLAMS)]
        slam = hit_take(samples, hit, SLAM_RING, LOUDNESS['capture-check'])
        yield 'capture-slide-check', to_pcm(ending_on(slide, slam))


def new_piece_after(samples, pawn, k):
    """`pawn`, then, NEW_PIECE_GAP after it ends, the new piece set down firmly: a check's pose."""
    piece = hit_take(samples, POSES_CHECK[k % len(POSES_CHECK)], 0.2, LOUDNESS['move-check'])
    at = len(pawn) + int(NEW_PIECE_GAP * RATE)
    both = np.zeros((at + len(piece), 2))
    both[: len(pawn)] += pawn
    both[at:] += piece
    return to_pcm(both)


def promotions(samples):
    """Each promotion, the pawn stepping or capturing, then its new piece."""
    for k, (_, end) in enumerate(PROMOTIONS):
        step = slide_take(samples, end - PAWN_STEP, end)
        pawn = ending_on(step, hit_take(samples, PAWN_POSES[k], 0.2, PAWN_LOUDNESS))
        yield 'promote', new_piece_after(samples, pawn, k)
    for k, (touch, hit) in enumerate(PROMOTION_CAPTURES):
        # Limited as the capture alone is, so a loud one doesn't quiet the new piece.
        pawn = limited(cut(samples, touch, hit, CAPTURE_RING, LOUDNESS['capture']))
        yield 'capture-promote', new_piece_after(samples, pawn, k)


def main():
    samples = decode(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.ogg'):
        old.unlink()
    counts = {}
    with tempfile.TemporaryDirectory() as folder:

        def write(name, pcm):
            counts[name] = counts.get(name, 0) + 1
            wav = Path(folder) / 'take.wav'
            wavfile.write(wav, RATE, pcm)
            ogg = OUT / f'{name}-{counts[name]}.ogg'
            subprocess.run(
                ['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-c:a', 'libopus', '-b:a', BITRATE]
                + ['-map_metadata', '-1', str(ogg)],
                check=True,
            )

        for name, start, hit, ring in takes():
            write(name, to_pcm(cut(samples, start, hit, ring, LOUDNESS[name])))
        for name, pcm in [*slides(samples), *promotions(samples)]:
            write(name, pcm)
    print(', '.join(f'{count} {name}' for name, count in counts.items()))


if __name__ == '__main__':
    main()
