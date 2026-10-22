"""What each wood measures: the numbers wood.py draws its grain and its colors from.

Every wood here is one of nine real boards, and every number was measured on a
photograph, never set by eye. Each board brings a pale wood and a figured one:

  birds-eye & walnut-burl    satin, 50 mm squares
  glossed-maple & glossed-burl    gloss, 50 mm squares
  birds-eye & vavona-burl    satin, 50 mm squares
  birds-eye & cocobolo    gloss, 63.5 mm squares
  birds-eye & amboyna-burl    gloss, 63.5 mm squares, three photographs
  pale-maple & elm-burl    gloss, 50 mm squares
  birds-eye & padauk    gloss, 63.5 mm squares, three photographs
  birds-eye & palisander    satin, 50 mm squares, two photographs
  curly-maple & pomelle    gloss, 63.5 mm squares, three photographs

The grain of each comes from the veneer scans of Wikimedia Commons' '<species> Holz'
series, whose panels are 180 mm across, a burl from the same series' '<species>-Maser
Holz': how many growth-ring lines cross a 50 mm square, how unevenly they are spaced,
how dark and how wide a line is, how much of the surface its pores darken, how much of
the drawing is the broad figure rather than lines, how far that figure runs along the
grain against across it, and which way it leans. Those last three have to come from a
scan and not from a board: a board photograph at a third of a millimetre to the pixel
has already lost the fine half of the split, and reads every wood as nothing but broad
figure.

What a veneer scan cannot give is how much of all that a board shows, nor how its
squares differ from one another, since it is one unbroken sheet. The board photographs
give those, a square of a known width being each photograph's own scale. All of them
say a board's squares sit nearly as far from one another as a square varies in itself,
which is `tone`, and none of them sorts its squares to match. Four of the boards show
the same maker's bird's eye maple, which measures one wood four times over and is the
check on the whole chain: its eyes cover 1, 2, 1 and 1 % of a square, 2.73, 2.86, 2.08
and 2.17 spreads deep, with nothing fitted to them.

A gloss, though, can cost that chain its spread inside a square. The two satin boards
read the bird's eye at 1.71 and 1.79; the cocobolo and amboyna boards at 3.10, 3.56 and
3.75, and the first glossed plain maple at 0.55. A varnish mirrors the room: head on it
washes the fine contrast out, obliquely it adds a contrast of its own, and a plane fitted
inside each square takes almost none of it back, so it is not a lamp. But three glossy
photographs read their own pale wood at 1.75, 1.80 and 1.95, the satin figure, and those
can be read off: a board's pale wood is the patch that says whether its photograph is
telling the truth about contrast. So `spread` comes from a satin board, or from a glossy
one its pale wood vouches for, and otherwise from the nearest satin wood.
A photograph cannot give the figure's width either: it measures 3.6 to 9.9 mm across the
boards, but the same for both woods of any one of them, which is the photograph's own
softness and not the wood's. Nor a ripple: the curly maple board was looked at for the
regular banding its wood is named for, and its squares answer 2.8 and its bubinga's 2.9,
then 5.1 and 5.9, always at 9 to 10 mm, the far end of the window searched. The same
number for both woods again, and at the longest period on offer, which is the broad
figure and not a ripple. The ripple is on that board's frame, in solid wood a hundred
millimetres wide; its 63 mm squares do not hold one a photograph can see.

Colors are measured outright where the photograph allows it: each board stands on a
neutral grey or a white cloth, which a grey-patch correction makes neutral again, so
what is left can be read off. A finish deepens a wood without touching its grain, so a
glossed wood is its own measurements under its own stops. Where a photograph is too
soft to measure a trajectory, the satin stops are carried onto the color it does
measure. And a high gloss can cost a photograph its colors outright: the cocobolo board
mirrors the bright red cabinet it stands in front of, square by square, so it reads
a* 40.5, a pure red no wood is, and its squares sit 7.7 L* apart where every matte
board here measured under 3.1. Its pattern is measurable and its colors are not, so
they alone are chosen, in the deep orange-red its wood is known for. The amboyna board
stands in the same room, but square by square its own squares sit 2.3 L* apart, so
nothing is reflected on them to speak of and its red-orange is its own.

Nothing of any photograph is in the extension: the textures are drawn from seeded
noise, and these numbers are all that crossed over.
"""

from typing import NamedTuple


class Wood(NamedTuple):
    """One species, as the references measure it."""

    lines: float
    """Growth-ring lines across a 50 mm square."""
    uneven: float
    """How unevenly their gaps run: their spread over their mean."""
    depth: float
    """How much a line darkens the wood, in percent of its lightness. Zero for a burl: a
    burl face is a knot of buds, not a stack of years, and has no rings to cross."""
    width: float
    """A line's width, in millimetres."""
    pores: float
    """The share of the surface its pores darken."""
    bands: float
    """The share of the drawing's spread that is the broad figure, the rest being the
    lines and the pores."""
    along: float
    """How many times longer that figure runs along the grain than across it: ten and
    more for a plainsawn wood, one for a burl, which has no grain direction left."""
    skew: float
    """Which way the figure leans: dark, below zero, for the thin dark bands a burl's
    whorls wind into, pale for the soft mottle of a maple."""
    eyes: float
    """The share of a square its eyes darken: the round marks a dormant bud leaves. Read
    as a share and not as a count, because a burl's run into one another and no count
    survives the threshold it was found at. A vavona burl is a seventh eye by surface,
    a bird's eye maple a sixtieth."""
    eye: float
    """An eye's width in millimetres."""
    bud: float
    """How deep an eye runs, in the spreads of the square it sits in. Together with
    `eyes` it says what share of a square's spread the eyes hold, `eyes * bud**2`, which
    is the one part of this that no threshold can move: a tenth for a bird's eye maple, a
    fifth for a walnut burl, a half for a vavona."""
    arch: float
    """How far under the surface the heart lies, in millimetres: the nearer, the more the
    lines arch into cathedrals."""
    spread: float
    """How far one square's own lightness spreads, in CIE L*."""
    tone: float
    """How far the board's squares sit from one another in lightness, in CIE L*. It ran
    from 0.9 to 3.0 over the eight boards, and is the maker's sorting as much as the
    species."""


# Curly maple is sugar maple again, so it keeps the lines and the pores of the others, and
# its own scan ('Ahorn, geriegelt') gives the figure. This is the one wood of the nine
# whose board and scan agree on the lean: +0.62 on the scan, +0.58 and +0.83 on two of the
# board's photographs, and +0.69 on plain maple's scan. A maple with no eyes leans pale.
# Pomelle bubinga's bubbles are eyes by any measure, over 4, 7 and 5 % of a square at 2.18,
# 1.22 and 1.62 mm, 1.91, 1.74 and 1.71 spreads deep, so they are drawn as eyes. Its own
# scan is of plain striped bubinga, which is the same wood under another cut: its figure
# and pores are kept, and its lines are the wenge's read by the same old method, closed up
# in the ratio of the two scans (35 peaks against 24) and half as wide (6.1 px against
# 12.0), at the 2.2 % its scan measures -- which is to say barely there, the figure and
# the bubbles carrying the drawing.
# 'African palisander' is a trade name, and the board's own numbers say which wood it is:
# the two it is sold as are wenge and bubinga, and this one measures L* 21.0 and 21.8 with
# marks 8.8 L* deep in it, where bubinga's scan is a pale wood whose lines go 2 % deep
# against wenge's 11.3. So it is wenge (Millettia laurentii), and the wenge scan's grain
# is its: the deepest lines of the eight by a wide margin, and as porous as the elm. No
# eyes: what the finder reads as eyes here are those lines. The board, satin and vouched
# for by its bird's eye at 1.64 and 1.42, gives it 2.9 L* of spread -- a dark wood's
# lightness has little room to move -- and 2.0 of tone, the closer-sorted of its two
# photographs, the other varying 3.11 in a* between squares, which is light and not wood.
# Bird's eye maple is sugar maple, a walnut burl is walnut and cocobolo is a rosewood, so
# each keeps its wood's lines and pores and brings its own figure, eyes and colors. Padauk
# is the only one of the seven with its own scan and no burl in it, so its whole grain is
# measured: the widest lines of them all at 1.27 mm, and a figure that runs eight times
# further along the grain than across it. Like cocobolo it has no eyes, its dark marks
# being its vessels, which the pores draw. The board gives it the least spread of any of
# the dark woods, 2.5 L*, and the closest-sorted squares, 1.15: a padauk face is a plain
# red barely broken. The
# eyes of each are the mean of the boards that show it, found at one threshold throughout:
# bird's eye maple 1, 2 and 1 % of the surface at 2.73, 2.86 and 2.08 spreads deep, the
# walnut burl 6 and 9 % at 1.62 and 1.70, the vavona 14 % at 1.82. Cocobolo's marks are
# its vessels, which the pores already draw, so it is left without eyes.
#                 lines uneven depth width pores bands along skew eyes eye bud arch spread tone
SPECIES = {
    'birds-eye': Wood(15.6, 0.56, 0.8, 0.81, 0.065, 0.62, 1.4, -0.2, 0.015, 1.7, 2.6, 70, 1.8, 1.3),
    'walnut-burl': Wood(17.6, 0.53, 0, 0.77, 0.064, 0.69, 1.1, -0.4, 0.075, 2.3, 1.7, 60, 4.0, 2.3),
    'vavona-burl': Wood(17.6, 0.53, 0, 0.77, 0.064, 0.58, 1.3, -1.66, 0.14, 2.7, 1.8, 60, 4.7, 3.0),
    'cocobolo': Wood(23.2, 0.67, 5.2, 0.82, 0.067, 0.27, 3.2, 0.34, 0, 0, 0, 45, 4.6, 2.0),
    'padauk': Wood(11.1, 0.44, 6.6, 1.27, 0.067, 0.57, 8.3, -0.94, 0, 0, 0, 65, 2.5, 1.15),
    'palisander': Wood(20.7, 0.57, 11.7, 1.12, 0.084, 0.3, 2.9, -0.12, 0, 0, 0, 50, 2.9, 2.0),
    'curly-maple': Wood(15.6, 0.56, 0.8, 0.81, 0.072, 0.33, 1.3, 0.62, 0, 0, 0, 70, 1.8, 1.6),
    'pomelle': Wood(30.2, 0.57, 2.2, 0.56, 0.073, 0.46, 1.3, -0.12, 0.05, 1.7, 1.8, 50, 4.9, 2.7),
}
# Amboyna is a burl too, and Commons has no scan of one, so it takes the walnut burl's
# grain and brings what its three photographs do measure: its eyes, over 8, 7 and 7 % of
# a square at 1.52, 2.04 and 1.21 mm, 1.69, 1.90 and 1.78 spreads deep, which is the same
# share of the surface as the walnut's in eyes half the size and twice as many; its tone,
# 2.52, 1.77 and 2.55; and its red-orange. Its spread is the walnut's, the burl it covers
# as much of a square as, since all three of its photographs are glossy. Its colors are
# the third photograph's: the first two read a* 43.7 and 41.8 against its 34.0, and they
# are the two whose frame holds the red cabinet the board stands in front of, where the
# third is a corner of it on bare grey.
SPECIES['amboyna-burl'] = SPECIES['walnut-burl']._replace(eye=1.6, bud=1.8, tone=2.3)
# The glossed board's maple is the same sugar maple, picked plain: its marks measure
# 0.4 mm and a third of a spread, which is to say pores and not eyes, so it keeps the
# scan's grain and is left without any. Its photograph reads a spread of 0.5 L*, which is
# the finish and not the wood, so the satin boards' 1.8 stands, less the tenth its eyes
# hold there.
SPECIES['glossed-maple'] = SPECIES['birds-eye']._replace(eyes=0, eye=0, bud=0, spread=1.7, tone=1.0)
# The same walnut burl under a gloss: the two boards' numbers are what they agree on.
SPECIES['glossed-burl'] = SPECIES['walnut-burl']
# The elm burl board's maple is plain sugar maple again, not an eye found on it over 24
# squares, and the palest of the three: L* 86.2 against the bird's eye's 71. Its own
# spread measures 1.80, which is the satin boards' figure for the same wood, and the
# check that lets its burl's be read off the same photograph.
SPECIES['pale-maple'] = SPECIES['glossed-maple']._replace(spread=1.8, tone=0.9)
# The elm burl is the one burl Commons scans ('Ruster-Maser Holz'), and the scan is of
# another cut of it: a wavy figure in long flames with a bud here and there, where this
# board's squares are clusters of small cells throughout. A species has more than one
# burl, so the scan's figure (a third broad against the others' two thirds, running five
# times further one way than the other) describes the sheet it was cut from and not this
# board, and only its pores are kept, which belong to the wood whatever the cut: 0.074,
# a tenth more than the walnut's, the most porous of the six (the same method reads the
# walnut at 0.074 against the table's 0.064, so this is that tenth and not a step).
# The rest is the walnut burl's, the burl that clusters as this one does, with what the
# board measures over it: eyes over 4 % of a square at 1.55 mm, 2.45 spreads deep, half
# the walnut's share in smaller and deeper marks; a tone of 1.34; and a spread of 4.47,
# which this one glossy photograph can be trusted for, measuring its own pale maple at
# the 1.8 L* the satin boards read for the same wood.
SPECIES['elm-burl'] = SPECIES['walnut-burl']._replace(
    pores=0.074, eyes=0.04, eye=1.6, bud=2.5, spread=4.5, tone=1.3
)

# Three colors each wood's finish gives it: a year's dark end, the wood's own color, and
# the pale wood just past a line.
STOPS = {
    'birds-eye': '#c99c6e #d2a77a #dbb286',
    'glossed-maple': '#d6b480 #f1d5a7 #fff0d0',
    'walnut-burl': '#45291e #633a29 #824b34',
    'glossed-burl': '#522e1e #6d3e2b #894f38',
    'vavona-burl': '#5c261c #793d2c #98553d',
    'cocobolo': '#54140e #873123 #b95e48',
    'amboyna-burl': '#7f2706 #a74d20 #cf743b',
    # Freshly finished padauk is a vermilion the veneer scan no longer is, that wood having
    # browned with the light: a* 57.6, 60.0 and 58.5 over the three photographs, so it is
    # the wood and not the room, and the third's are taken, the one shot on bare grey.
    'padauk': '#a31100 #c42a08 #e64013',
    'palisander': '#312019 #452d25 #5b3a31',
    'curly-maple': '#ecc5a0 #f3d3af #f9e0bf',
    'pomelle': '#992504 #b54316 #d15f28',
    'elm-burl': '#752910 #8f421e #aa5c2e',
    'pale-maple': '#e0caa7 #e5d7b4 #eae4c0',
}
