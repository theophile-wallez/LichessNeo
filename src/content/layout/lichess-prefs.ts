import { z } from 'zod/mini';
import { isParsing, onHeadParsed, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { parseJson } from '#shared/json.ts';
import { readPageInitData } from '#shared/page-init-data.ts';

// Lichess preferences our own parts follow, one word each in `data-ln-ext-prefs` on <html>:
// - `coords-in`: the user wants the coordinates inside the board. Read off <body> as the
//   server sends it, since Lichess swaps `coords-out` for `coords-in` later, while its eval
//   gauge shows (styles/board/coordinates.css).
// - `no-captured`: "Material difference" is off (styles/playerbar.css).
// - `no-animation`: Lichess doesn't animate the pieces in this game (styles/game/intro).
// The last two only a game's or an analysis board's data says.

// Lichess leaves a false `showCaptured` out of a game's data, and sends no prefs at all for
// some watchers: then nothing is known.
const PrefSchema = z.object({
  showCaptured: z.optional(z.boolean()),
  animationDuration: z.optional(z.number()),
});

const DataSchema = z.object({ pref: z.optional(z.nullable(PrefSchema)) });

// The game page's data is at the top, the analysis board's in its cfg.
const PageInitSchema = z.union([
  z.object({ data: DataSchema }),
  z.object({ cfg: z.object({ data: DataSchema }) }),
]);

/** The words a page's init data gives. */
export function initDataPrefs(initData: string | null): string[] {
  const init = parseJson(initData, PageInitSchema);
  const pref = init && ('data' in init ? init.data.pref : init.cfg.data.pref);
  if (!pref) return [];
  const words: string[] = [];
  if (pref.showCaptured !== true) words.push('no-captured');
  if (pref.animationDuration === 0) words.push('no-animation');
  return words;
}

const words = new Set<string>();

function addWords(added: readonly string[]): void {
  for (const word of added) words.add(word);
  setData(document.documentElement, 'lnExtPrefs', words.size > 0 ? [...words].join(' ') : null);
}

export const lichessPrefs: Feature = {
  name: 'lichess prefs',
  start: () => {
    // Only the body the server sent says what the user picked.
    if (!isParsing()) return;
    onHeadParsed(() =>
      addWords(document.body.classList.contains('coords-in') ? ['coords-in'] : []),
    );
    readPageInitData(text => addWords(initDataPrefs(text)));
  },
};
