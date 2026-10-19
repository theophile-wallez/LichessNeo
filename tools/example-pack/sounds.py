"""Synthesizes the example pack's sounds, packs/example/sounds/<name>.wav: short
wooden knocks and chimes made from decaying sine waves and a little noise,
so the example owes nothing to anyone's recordings.

Run it again after changing a sound. Needs only Python.

  python3 tools/example-pack/sounds.py
"""

import math
import random
import struct
import wave
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / 'packs/example/sounds'
RATE = 22050


def knock(pitch, length=0.09, noise=0.35, decay=55.0):
    """A wooden knock: two partials and a burst of noise, all dying fast."""
    rng = random.Random(pitch)
    samples = []
    for i in range(int(RATE * length)):
        t = i / RATE
        tone = math.sin(2 * math.pi * pitch * t) + 0.5 * math.sin(2 * math.pi * pitch * 2.7 * t)
        samples.append(
            (0.6 * tone + noise * rng.uniform(-1, 1) * math.exp(-t * 400)) * math.exp(-t * decay)
        )
    return samples


def chime(start, end, length):
    """A bell-like tone gliding from one pitch to another."""
    samples = []
    phase = 0.0
    for i in range(int(RATE * length)):
        t = i / RATE
        pitch = start + (end - start) * min(1.0, t / (length * 0.4))
        phase += 2 * math.pi * pitch / RATE
        attack = min(1.0, t * 200)
        samples.append(
            0.5 * (math.sin(phase) + 0.3 * math.sin(2 * phase)) * attack * math.exp(-t * 7)
        )
    return samples


def buzz(pitch, length):
    samples = []
    for i in range(int(RATE * length)):
        t = i / RATE
        square = 1.0 if math.sin(2 * math.pi * pitch * t) >= 0 else -1.0
        samples.append(0.25 * square * min(1.0, t * 300) * math.exp(-t * 12))
    return samples


def silence(length):
    return [0.0] * int(RATE * length)


def mix(*parts):
    """Plays the parts one after the other."""
    return [sample for part in parts for sample in part]


SOUNDS = {
    'move-self': knock(720),
    'move-opponent': knock(560),
    'move-check': mix(knock(720), chime(1480, 1480, 0.18)),
    'capture': knock(430, length=0.12, noise=0.8, decay=40.0),
    'castle': mix(knock(700), silence(0.05), knock(600)),
    'promote': chime(880, 1320, 0.3),
    'premove': knock(1400, length=0.05, noise=0.1, decay=90.0),
    'illegal': buzz(180, 0.16),
    'notify': mix(chime(660, 660, 0.14), chime(990, 990, 0.3)),
    'tenseconds': mix(*(mix(chime(1000, 1000, 0.08), silence(0.08)) for _ in range(3))),
    'game-start': chime(523, 784, 0.45),
    'game-end': chime(784, 523, 0.5),
}


def write(name, samples):
    peak = max(abs(sample) for sample in samples) or 1.0
    frames = b''.join(struct.pack('<h', int(sample / peak * 0.8 * 32767)) for sample in samples)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(frames)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, samples in SOUNDS.items():
        write(name, samples)
        print(f'packs/example/sounds/{name}.wav')


if __name__ == '__main__':
    main()
