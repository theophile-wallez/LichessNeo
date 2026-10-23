import { type Asked, fakeApi, type Route, text } from './fake-api.ts';

// Test support: Lichess's studies as practice's sync sees them, kept in
// memory: the list of the user's, a study's export as PGN, a chapter added, a
// chapter's moves rewritten. A study set to fail answers a 500.

export interface FakeChapter {
  readonly id: string;
  readonly name: string;
  readonly orientation: string;
  pgn: string;
}

export interface FakeStudies {
  /** Each study's chapters, by its id. */
  readonly studies: Map<string, FakeChapter[]>;
  readonly asked: Asked[];
  /** The studies whose routes answer an error. */
  readonly failing: Set<string>;
  readonly chapter: (study: string, name: string) => FakeChapter | undefined;
}

const exported = (study: string, chapter: FakeChapter): string =>
  [
    `[Event "Study: ${chapter.name}"]`,
    `[ChapterName "${chapter.name}"]`,
    `[ChapterURL "https://lichess.org/study/${study}/${chapter.id}"]`,
    `[Orientation "${chapter.orientation}"]`,
    '',
    chapter.pgn,
  ].join('\n');

/** The study's id in a route's address: the word after `study/`. */
const studyIn = (url: string): string => /study\/(\w+)/.exec(url)?.[1] ?? '';

/** The user's studies, named by id, with `routes` of the test's answering first. */
export function fakeStudies(
  names: Readonly<Record<string, string>>,
  routes: readonly (readonly [RegExp, Route])[] = [],
): FakeStudies {
  const studies = new Map<string, FakeChapter[]>(Object.keys(names).map(id => [id, []]));
  const failing = new Set<string>();
  let made = 0;
  const chaptersOf = (url: string): FakeChapter[] | null =>
    failing.has(studyIn(url)) ? null : (studies.get(studyIn(url)) ?? null);
  const exportStudy: Route = ({ url }) => {
    const chapters = chaptersOf(url);
    if (!chapters) return text('', 500);
    return text(chapters.map(each => exported(studyIn(url), each)).join('\n\n\n'));
  };
  const importChapter: Route = ({ url, body }) => {
    const chapters = chaptersOf(url);
    if (!chapters) return text('', 500);
    made++;
    chapters.push({
      id: `chap${String(made).padStart(4, '0')}`,
      name: body.get('name') ?? '',
      orientation: body.get('orientation') ?? 'white',
      pgn: body.get('pgn') ?? '',
    });
    return text('');
  };
  const rewrite: Route = ({ url, body }) => {
    const id = /\/(\w+)\/moves$/.exec(url)?.[1];
    const chapter = chaptersOf(url)?.find(each => each.id === id);
    if (!chapter) return text('', 404);
    chapter.pgn = body.get('pgn') ?? '';
    return text('{"ok":true}');
  };
  const list: Route = () =>
    text([...studies.keys()].map(id => JSON.stringify({ id, name: names[id] ?? id })).join('\n'));
  const asked = fakeApi([
    ...routes,
    [/^\/study\/\w+\.pgn\?/, exportStudy],
    [/^\/study\/\w+\/import-pgn\?sri=/, importChapter],
    [/^\/api\/study\/\w+\/\w+\/moves$/, rewrite],
    [/^\/api\/study\/by\//, list],
  ]);
  const chapter = (study: string, name: string): FakeChapter | undefined =>
    studies.get(study)?.find(each => each.name === name);
  return { studies, asked, failing, chapter };
}
