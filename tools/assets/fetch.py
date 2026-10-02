"""Microsoft's Fluent Emoji (MIT), bundled in public/img/icons so that the
extension loads nothing from another site while it runs.

Downloads what the code names and the folder lacks:

  public/img/icons/<name>.svg   every img/icons/<name>.svg of the CSS in src/styles,
                                the "Color" style of the emoji EMOJI names

Run it again when a rule names a new icon (add it to EMOJI first). Existing
files are kept unless --force. Needs only Python.

  python3 tools/assets/fetch.py [--force]
"""

import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STYLES_DIR = ROOT / 'src/styles'
ICONS_DIR = ROOT / 'public/img/icons'
ASSETS = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets'
# Each icon's emoji, as its folder is named in the repository's assets.
EMOJI = {
    'ballot-box': 'Ballot box with ballot',
    'bar-chart': 'Bar chart',
    'bookmark-tabs': 'Bookmark tabs',
    'books': 'Books',
    'brain': 'Brain',
    'bullseye': 'Bullseye',
    'chart-increasing': 'Chart increasing',
    'circus-tent': 'Circus tent',
    'clipboard': 'Clipboard',
    'collision': 'Collision',
    'crossed-swords': 'Crossed swords',
    'crown': 'Crown',
    'eyes': 'Eyes',
    'globe': 'Globe with meridians',
    'graduation-cap': 'Graduation cap',
    'handshake': 'Handshake',
    'high-voltage': 'High voltage',
    'light-bulb': 'Light bulb',
    'locked': 'Locked',
    'microscope': 'Microscope',
    'mobile-phone': 'Mobile phone',
    'newspaper': 'Newspaper',
    'open-book': 'Open book',
    'puzzle-piece': 'Puzzle piece',
    'question-mark': 'Red question mark',
    'red-heart': 'Red heart',
    'robot': 'Robot',
    'satellite-antenna': 'Satellite antenna',
    'shield': 'Shield',
    'speech-balloon': 'Speech balloon',
    'spiral-calendar': 'Spiral calendar',
    'sports-medal': 'Sports medal',
    'stopwatch': 'Stopwatch',
    'teacher': 'Teacher',
    'trophy': 'Trophy',
    'upside-down-face': 'Upside-down face',
    'video-camera': 'Video camera',
    'zombie': 'Person zombie',
}
ATTEMPTS = 3


def download(url):
    for attempt in range(1, ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            if attempt == ATTEMPTS:
                raise
        except Exception:
            if attempt == ATTEMPTS:
                raise
        time.sleep(1)


def emoji_urls(folder):
    """The emoji's Color SVG, where it has no skin tones, then where it has."""
    stem = folder.lower().replace(' ', '_')
    quoted = urllib.parse.quote(folder)
    yield f'{ASSETS}/{quoted}/Color/{stem}_color.svg'
    yield f'{ASSETS}/{quoted}/Default/Color/{stem}_color_default.svg'


def icon_names():
    return sorted(
        {
            name
            for stylesheet in STYLES_DIR.rglob('*.css')
            for name in re.findall(r'img/icons/([\w-]+)\.svg', stylesheet.read_text())
        }
    )


def fetch(name, force):
    path = ICONS_DIR / f'{name}.svg'
    if path.exists() and not force:
        return
    folder = EMOJI.get(name)
    if folder is None:
        sys.exit(f'{name}: no emoji in EMOJI')
    for url in emoji_urls(folder):
        svg = download(url)
        if svg is not None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(svg)
            print(path.relative_to(ROOT))
            return
    sys.exit(f'{name}: {folder} not found')


def main(force):
    for name in icon_names():
        fetch(name, force)


if __name__ == '__main__':
    main('--force' in sys.argv)
