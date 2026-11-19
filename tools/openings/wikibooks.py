"""Wikibooks' Chess Opening Theory (CC BY-SA), one page per position, read
from Wikimedia's dump of Wikibooks with each page's moves played out: the
source the coach's theory is rewritten from (src/page/review/theory). Writes a
JSON list of {title, moves, key, text, children}. Needs python-chess.

  curl -O https://dumps.wikimedia.org/enwikibooks/latest/enwikibooks-latest-pages-articles.xml.bz2
  python3 tools/openings/wikibooks.py enwikibooks-latest-pages-articles.xml.bz2 <out.json>
"""

import bz2
import json
import re
import sys
import xml.etree.ElementTree as ET

import chess

PREFIX = 'Chess Opening Theory/'
# "1. e4", "1...e5", "12. O-O", "3...Nxd4", with Wikibooks' own spellings.
STEP = re.compile(r'^(\d+)\s*(\.\.\.|\.)\s*(\S+)$')


def plain(wikitext):
    """A page's prose: its templates (diagrams, boxes), references and markup taken out."""
    text = re.sub(r'<ref[^>]*/>|<ref.*?</ref>|<!--.*?-->', '', wikitext, flags=re.S)
    while re.search(r'\{\{[^{}]*\}\}', text):
        text = re.sub(r'\{\{[^{}]*\}\}', '', text)
    text = re.sub(r'\{\|.*?\|\}', '', text, flags=re.S)
    text = re.sub(r'\[\[(?:File|Image|Category):[^\]]*\]\]', '', text)
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', text)
    text = re.sub(r'\[https?://\S+ ([^\]]*)\]', r'\1', text)
    text = re.sub(r"'{2,}", '', text)
    text = re.sub(r'<[^>]+>', '', text)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def moves_of(title):
    """The SAN moves a page's title spells, or None for a page that isn't a position."""
    steps = title[len(PREFIX):].split('/')
    board, moves = chess.Board(), []
    for step in steps:
        match = STEP.match(step.strip())
        if not match:
            return None
        try:
            move = board.parse_san(match.group(3))
        except ValueError:
            return None
        moves.append(board.san(move))
        board.push(move)
    return moves


def key_of(moves):
    board = chess.Board()
    for san in moves:
        board.push_san(san)
    # Board, side to move and castling: en passant squares are written differently by
    # Lichess's server and its board, and hardly matter in a book position.
    return ' '.join(board.fen().split()[:3])


def dump_pages(path):
    """(title, wikitext) of each of the book's pages in the dump, redirects left out."""
    title, text, redirect = None, '', False
    for _, element in ET.iterparse(bz2.open(path), events=('end',)):
        tag = element.tag.rsplit('}', 1)[-1]
        if tag == 'title':
            title = element.text or ''
        elif tag == 'redirect':
            redirect = True
        elif tag == 'text':
            text = element.text or ''
        elif tag == 'page':
            if title and title.startswith(PREFIX) and not redirect:
                yield title, text
            title, text, redirect = None, '', False
            element.clear()


def main(dump, out):
    pages = []
    for title, wikitext in dump_pages(dump):
        moves = moves_of(title)
        if moves:
            pages.append({'title': title, 'moves': moves, 'key': key_of(moves),
                          'text': plain(wikitext)})
    by_length = {}
    for page in pages:
        by_length.setdefault(len(page['moves']), []).append(page)
    for page in pages:
        line = page['moves']
        page['children'] = [other['moves'][-1] for other in by_length.get(len(line) + 1, [])
                            if other['moves'][:-1] == line]
    pages.sort(key=lambda page: page['moves'])
    with open(out, 'w', encoding='utf8') as file:
        json.dump(pages, file, ensure_ascii=False, indent=1)
    print(f'{len(pages)} positions, {sum(1 for page in pages if len(page["text"]) > 200)} with text')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
