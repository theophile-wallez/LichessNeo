"""Pushes the coach's opening theory (theory.py's PGN) to its public study on
lichess.org, which the review reads at run time (src/page/review/theory/book.ts):
each chapter is imported anew, then the old ones are deleted. A study holds 64
chapters at most, so all but one of the old ones go first, and the last once
the new ones are in (a study left with none gets an empty one of Lichess's). A
language whose study src/page/review/theory/studies.json lacks gets one, its id
written there.

  LICHESS_TOKEN=<token> python3 tools/openings/study.py <folder>

The token is a personal one of the studies' owner, with the study:write scope
(lichess.org/account/oauth/token/create?scopes[]=study:write).
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IDS = ROOT / 'src/page/review/theory/studies.json'
NAMES = {'en': 'Lichess Neo: Analysis', 'fr': 'Lichess Neo : Analyse'}
# Lichess answers a script it takes for a crawler with a 404 page.
AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
MAX_CHAPTERS = 64
CHAPTER_URL = re.compile(r'\[ChapterURL "https://lichess\.org/study/\w{8}/(\w{8})"\]')


def call(method, path, token, form=None):
    data = urllib.parse.urlencode(form).encode() if form else None
    request = urllib.request.Request(f'https://lichess.org{path}', data=data, method=method)
    if token:
        request.add_header('Authorization', f'Bearer {token}')
    request.add_header('User-Agent', AGENT)
    for _ in range(10):
        try:
            with urllib.request.urlopen(request) as response:
                return response.read().decode('utf8')
        except urllib.error.HTTPError as error:
            if error.code != 429:
                sys.exit(f'{method} {path}: {error.code} {error.read().decode("utf8", "replace")[:300]}')
            # Lichess serves one request at a time per address: wait for the other one to end.
            print(f'{method} {path}: 429, waiting a minute', flush=True)
            time.sleep(61)
    sys.exit(f'{method} {path}: still 429 after ten minutes')


def create(language, token):
    form = {
        'name': NAMES[language],
        'visibility': 'public',
        'computer': 'everyone',
        'explorer': 'everyone',
        'cloneable': 'everyone',
        'shareable': 'everyone',
        'chat': 'member',
    }
    return json.loads(call('POST', '/api/study', token, form))['id']


def import_chapter(study, chapter, token):
    # Lichess answers a chapter it refuses with a 200 too: {"chapters": [], "error": "PGN too large"}.
    answer = json.loads(call('POST', f'/api/study/{study}/import-pgn', token, {'pgn': chapter, 'orientation': 'white'}))
    if answer.get('error') or not answer.get('chapters'):
        name = chapter.split('\n', 1)[0]
        sys.exit(f'{name}: refused ({answer.get("error") or "no chapter made"}), the study is half pushed')


def push(study, pgn, token):
    # The study is public: its export needs no token (nor study:read, which this one lacks).
    old = CHAPTER_URL.findall(call('GET', f'/api/study/{study}.pgn?comments=false', None))
    chapters = [
        chapter if chapter.startswith('[Event ') else f'[Event {chapter}'
        for chapter in pgn.strip().split('\n\n[Event ')
    ]
    room = MAX_CHAPTERS - min(len(old), 1)
    if len(chapters) > room:
        sys.exit(f'{len(chapters)} chapters: the study has room for {room}, with one old one kept meanwhile')
    for chapter in old[1:]:
        call('DELETE', f'/api/study/{study}/{chapter}', token)
    for chapter in chapters:
        import_chapter(study, chapter, token)
    for chapter in old[:1]:
        call('DELETE', f'/api/study/{study}/{chapter}', token)


def main():
    token = os.environ.get('LICHESS_TOKEN')
    if len(sys.argv) != 2 or not token:
        sys.exit('Usage: LICHESS_TOKEN=<token> study.py <folder>')
    folder = Path(sys.argv[1])
    ids = json.loads(IDS.read_text(encoding='utf8')) if IDS.exists() else {}
    for language in NAMES:
        if language not in ids:
            ids[language] = create(language, token)
            IDS.write_text(json.dumps(ids, indent=2) + '\n', encoding='utf8')
        pgn = folder / f'{language}.pgn'
        if not pgn.exists():
            print(f'{language}: no {pgn.name}, left as it is')
            continue
        push(ids[language], pgn.read_text(encoding='utf8'), token)
        print(f'{language}: https://lichess.org/study/{ids[language]}')


if __name__ == '__main__':
    main()
