import type { Page } from '@playwright/test';
import { z } from 'zod/mini';
import { readPageGlobal } from './lichess.ts';

// Our sounds, registered in Lichess's sound player (`site.sound`) under lr-ext- names.

export const OUR_SOUND_PREFIX = 'lr-ext-';

// The player's paths: a Map from each sound's name to its URL.
const PathsSchema = z.array(z.tuple([z.string(), z.string()]));

/** Our sounds in the page's player, by name: none until the page script has handed them over. */
export async function ourSounds(page: Page): Promise<Map<string, string>> {
  const paths = await readPageGlobal(page, ['site', 'sound', 'paths']);
  // Lichess sets its player up as the page loads.
  if (paths === undefined) return new Map();
  const entries = PathsSchema.parse(paths);
  return new Map(entries.filter(([name]) => name.startsWith(OUR_SOUND_PREFIX)));
}

/** Starts recording the sounds Lichess's player is asked for, by name. */
export async function recordSounds(page: Page): Promise<void> {
  await page.evaluate(() => {
    const sound: unknown = Reflect.get(Reflect.get(window, 'site'), 'sound');
    const load: unknown = Reflect.get(Object(sound), 'load');
    if (typeof load !== 'function') throw new Error('Lichess’s sound player has no load()');
    const heard: unknown[] = [];
    Reflect.set(window, 'lrExtHeard', heard);
    // `play()` loads the sound it's given through `this.load`, where ours are lr-ext- names.
    Reflect.set(Object(sound), 'load', (...args: unknown[]): unknown => {
      heard.push(args[0]);
      const loaded: unknown = Reflect.apply(load, sound, args);
      return loaded;
    });
  });
}

/** The sounds asked for since the last call, and forgets them. */
export async function heardSounds(page: Page): Promise<string[]> {
  const heard = await page.evaluate((): unknown => {
    const list: unknown = Reflect.get(window, 'lrExtHeard');
    if (!Array.isArray(list)) return undefined;
    const taken: unknown[] = list.splice(0);
    return taken;
  });
  return z.array(z.string()).parse(heard);
}
