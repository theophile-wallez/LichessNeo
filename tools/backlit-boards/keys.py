"""The backlit boards' keys (src/styles/board/backlit-keys.css), each board's
in its colors.

Each board has its colors for both schemes, Lichess's light one in pale keys.
A board is a tile of 2×2 squares, light top left as the blue board's: each a
key inset in its square on the board's frame, shaded top to bottom, with a
lit top edge and a dark bottom one. The inset and the corners are those
page/backlit/sprites.ts lights. Each board also has its own light, its
`--lr-ext-backlit-tint`, for the light picked as "Board".

  python3 tools/backlit-boards/keys.py
"""

import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/styles/board/backlit-keys.css'
INSET = 2.75
RADIUS = 9.6

# id: for each scheme, (light key top, bottom), (dark key top, bottom), the
# frame and the light. On the light scheme the keys are pale, and the light
# deeper, the accent kept whole (on the dark one, a quarter is white): a pale
# light won't show on pale keys.
BOARDS = {
    'backlit': {
        'dark': (('#5d6372', '#4e5361'), ('#2f333d', '#262931'), '#0c0d10', '#dfe6ff'),
        'light': (('#f2f3f7', '#e6e8ee'), ('#b7bdca', '#a9b0be'), '#8d94a3', '#4c5bd4'),
    },
    'backlit-midnight': {
        'dark': (('#4f5f8c', '#43517a'), ('#1f2742', '#192036'), '#080b16', '#8aa2ff'),
        'light': (('#eef1fb', '#e1e6f6'), ('#a7b4db', '#98a7d2'), '#7b8aba', '#3550e8'),
    },
    'backlit-forest': {
        'dark': (('#61806a', '#52705b'), ('#2a3b30', '#223128'), '#0a100c', '#8be9b0'),
        'light': (('#eef5ef', '#e1ece3'), ('#a7c3ad', '#98b79f'), '#7d9d85', '#16904c'),
    },
    'backlit-walnut': {
        'dark': (('#8a6a4f', '#785b43'), ('#3d2c20', '#33251b'), '#120c08', '#ffb86c'),
        'light': (('#f7f0e7', '#eee3d5'), ('#cfb399', '#c3a589'), '#a5886d', '#d96c00'),
    },
    'backlit-amethyst': {
        'dark': (('#6c5a8e', '#5d4d7c'), ('#2e2640', '#262035'), '#0d0a14', '#ff79c6'),
        'light': (('#f4f0fa', '#e9e2f4'), ('#c0b0d8', '#b2a0ce'), '#9886b7', '#c2187a'),
    },
    'backlit-panda': {
        'dark': (('#c4c8d0', '#b3b8c2'), ('#3d414b', '#343842'), '#14161a', '#bd93f9'),
        'light': (('#f0f1f4', '#e3e5ea'), ('#5c616d', '#525763'), '#383b43', '#7c4dff'),
    },
}


def gradient(name, top, bottom):
    return (
        f"<linearGradient id='{name}' x1='0' y1='0' x2='0' y2='1'>"
        f"<stop offset='0' stop-color='{top}'/><stop offset='1' stop-color='{bottom}'/>"
        '</linearGradient>'
    )


def key(x, y, fill):
    size = 100 - 2 * INSET
    box = f"x='{x + INSET}' y='{y + INSET}' width='{size}' height='{size}' rx='{RADIUS}'"
    return (
        f"<rect {box} fill='url(#{fill})'/>"
        f"<rect {box} fill='none' stroke='url(#e)' stroke-width='1'/>"
    )


def tile(light, dark, frame):
    edge = (
        "<linearGradient id='e' x1='0' y1='0' x2='0' y2='1'>"
        "<stop offset='0' stop-color='#fff' stop-opacity='.12'/>"
        "<stop offset='.5' stop-color='#fff' stop-opacity='0'/>"
        "<stop offset='1' stop-color='#000' stop-opacity='.35'/>"
        '</linearGradient>'
    )
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs>"
        + gradient('l', *light)
        + gradient('d', *dark)
        + edge
        + f"</defs><rect width='200' height='200' fill='{frame}'/>"
        + key(0, 0, 'l')
        + key(100, 0, 'd')
        + key(0, 100, 'd')
        + key(100, 100, 'l')
        + '</svg>'
    )
    return 'data:image/svg+xml,' + urllib.parse.quote(svg, safe="=:/'() ,.-")


def rule(board, scheme, light, dark, frame, tint):
    html = 'html.light' if scheme == 'light' else 'html'
    lines = [
        f"{html}[data-lr-ext-board='{board}'],",
        f"{html} #dasher_app .lr-ext-src-thumb[data-lr-ext-theme='{board}'] {{",
        f'  --lr-ext-backlit-keys: url("{tile(light, dark, frame)}");',
        f'  --lr-ext-backlit-tint: {tint};',
    ]
    if scheme == 'light':
        lines.append('  --lr-ext-backlit-lift: 100%;')
    return '\n'.join([*lines, '}'])


HEADER = """/* The backlit boards' keys and lights (styles/board/backlit.css), on <html> for the board shown
 * and on each one's tile in the user menu, for each scheme. Written by tools/backlit-boards/keys.py: edit the
 * colors there. */
"""

RULES = [
    rule(board, scheme, *colors)
    for scheme in ('dark', 'light')
    for board, schemes in BOARDS.items()
    for colors in [schemes[scheme]]
]
OUT.write_text(HEADER + '\n' + '\n\n'.join(RULES) + '\n')
