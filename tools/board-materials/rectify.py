"""Where every square of a board lies in a photograph of it.

The chequerboard is its own calibration target: no ruler, no printed pattern and no lens
model are needed, only the corners where four of its squares meet. The perspective and
the lens are fitted to all of them at once, so one corner found on the wrong side of a
vein moves the surface by a fraction of itself instead of tearing a square out of line.
"""

import cv2
import numpy as np


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
