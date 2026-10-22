"""What a photograph's own blur is, and how much of it can be taken back off.

A square boundary is a step between two levels, at a place the grid already knows
exactly. So the light sampled across it -- over the whole length of every boundary in
frame, hundreds of them, which is what makes the reading steady -- gives the photograph's
own blur with nothing assumed and nothing set by eye: no lens model, no test chart, and no
guess at how sharp the camera was.

Richardson-Lucy then takes that blur back off, and stops where the boundaries say there is
no blur left to take. That stopping rule is the whole point. Run past its own evidence, a
deconvolution turns the grain of a wood into gravel and a square's JPEG blocks into a
quilt; stopped by it, what comes out is what the photograph saw.

Nothing here invents detail, and nothing here is what makes a square sharp either: the
photographs are too small for that, 50 to 230 pixels to a square against the 256 a texture
wants, and upscale.py closes that gap before any of this runs. What is left for this to do
on a photograph already enlarged is small and real -- the cocobolo's boundaries read 1.45
pixels wide and 1.13 once unblurred -- and it is the honest part of the two: this takes
back a blur it measured, where the model draws grain of about the right density in the
wrong places.
"""

import cv2
import numpy as np
from scipy import ndimage, optimize, special

# Where to sample across a boundary, in pixels, and how far along it to stay away from the
# corners, where two boundaries meet and neither is a clean step.
REACHES = np.linspace(-4, 4, 33)
ALONG = np.linspace(0.12, 0.88, 12)

# A step cannot be recorded sharper than the grid that recorded it: at one pixel of width
# there is one sample across the edge, which is the limit of what the photograph holds.
# Deconvolving past it recovers nothing that was ever there and amplifies the grain in its
# place, which shows up as a square's lightness spreading further than the real board's.
SHARP = 1.0
# Richardson-Lucy rounds. The first two take back most of the measured width and the
# fourth takes back the rest of what shows; past that the boundaries stop getting sharper
# and the darkest woods, where a photograph's JPEG blocks have the least signal to hide
# behind, start to read as a quilt at 45 degrees.
ROUNDS = 4


def sampled(glow, place, rows, columns):
    """The light across every inner boundary of the grid, a row per place along one."""
    height, width = glow.shape
    lines = []
    for row in range(1, rows + 1):
        for column in range(1, columns + 1):
            # The boundary left of this corner, then the one above it: both axes, so a
            # blur longer one way than the other is read as what it is.
            lines.append(([column, column], [row - 1, row], [0.04, 0]))
            lines.append(([column - 1, column], [row, row], [0, 0.04]))
    walks = []
    for (left, right), (top, bottom), step in lines:
        walk = [(left + (right - left) * t, top + (bottom - top) * t) for t in ALONG]
        at = place(walk)
        past = place([(x + step[0], y + step[1]) for x, y in walk])
        ways = (past - at) / np.maximum(np.hypot(*(past - at).T), 1e-9)[:, None]
        for base, way in zip(at, ways, strict=True):
            spots = base + np.outer(REACHES, way)
            off = (spots[:, 0] > width - 2).any() or (spots[:, 1] > height - 2).any()
            if spots.min() >= 1 and not off:
                walks.append(spots)
    if not walks:
        return np.array([])
    # Every profile read in one call. A photograph enlarged four times holds tens of
    # millions of pixels and there are over a thousand profiles: converting it, or letting
    # the remap walk it, once per profile costs more than everything else here together.
    spots = np.stack(walks).astype(np.float32)
    return cv2.remap(glow.astype(np.float32), spots[..., 0], spots[..., 1], cv2.INTER_LINEAR)


def blurred(profile):
    """The width of the Gaussian that turns a step into this profile, and the step's own
    height, which says whether a step is what was sampled at all."""

    def model(reach, low, high, middle, sigma):
        return low + (high - low) * 0.5 * (1 + special.erf((reach - middle) / (sigma * np.sqrt(2))))

    fit, _ = optimize.curve_fit(
        model, REACHES, profile, p0=(profile[0], profile[-1], 0.0, 1.0), maxfev=20000
    )
    return abs(fit[3]), abs(fit[1] - fit[0])


def width(profiles):
    """How far this photograph smears a step, in pixels: the median over every boundary it
    showed, counting only the ones that read as a step at all."""
    widths = []
    for profile in profiles:
        try:
            spread, step = blurred(profile)
        except RuntimeError:
            continue
        if 0.05 < spread < 4 and step > 0.01:
            widths.append(spread)
    return float(np.median(widths)) if len(widths) >= 20 else None


def lucy(linear, sigma, rounds):
    """Richardson-Lucy against a Gaussian of `sigma`, in light, where a blur is a blur:
    done on the sRGB values instead it would darken every edge it sharpened."""
    observed = np.maximum(linear, 1e-7)
    estimate = observed.copy()
    for _ in range(rounds):
        blur = np.maximum(ndimage.gaussian_filter(estimate, (sigma, sigma, 0)), 1e-7)
        estimate = estimate * ndimage.gaussian_filter(observed / blur, (sigma, sigma, 0))
        estimate = np.clip(estimate, 0, estimate.max())
    return estimate


def unblurred(linear, place, rows, columns, luma):
    """`linear` with its own blur taken off, and how sharp its square boundaries read
    before and after. Only the part of the blur that is not the pixel grid's own is taken:
    Gaussians add in quadrature, so that part is what is left of the measured width once
    one pixel is taken out of it, and nothing is asked of the photograph that it could not
    have recorded."""
    blur = width(sampled(linear @ luma, place, rows, columns))
    if blur is None or blur <= SHARP:
        return linear, blur, blur
    sharpened = lucy(linear, float(np.sqrt(blur**2 - SHARP**2)), ROUNDS)
    return sharpened, blur, width(sampled(sharpened @ luma, place, rows, columns))
