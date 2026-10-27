import { z } from 'zod/mini';
import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { MEDAL_IDS, medals, METALS, type Medal, type MedalId } from './medals-model.ts';
import { medalsMarkup } from './medals-view.ts';
import { profileName, profileUser } from './user.ts';

// The profile's medals, a row under its chart. On the player's own profile,
// those won since they last looked are new: they glow and spin in.

const SeenSchema = z.object({
  user: z.string(),
  metals: z.partialRecord(z.enum(MEDAL_IDS), z.enum(METALS)),
});

type Seen = z.infer<typeof SeenSchema>;

const rank = (metal: string | undefined): number =>
  metal === undefined ? -1 : METALS.findIndex(each => each === metal);

/** The medals whose metal beats the one last seen; none the first time. */
function freshMedals(list: readonly Medal[], seen: Seen | null): Set<MedalId> {
  if (!seen) return new Set();
  const fresh = list.filter(medal => rank(medal.metal ?? undefined) > rank(seen.metals[medal.id]));
  return new Set(fresh.map(medal => medal.id));
}

function seenNow(user: string, list: readonly Medal[]): Seen {
  const metals: Seen['metals'] = {};
  for (const medal of list) if (medal.metal) metals[medal.id] = medal.metal;
  return { user, metals };
}

/** On the player's own profile, what's new since last time; then this is what they've seen. */
function takeFresh(name: string, list: readonly Medal[]): Set<MedalId> {
  const user = name.toLowerCase();
  if (document.body.dataset.user?.toLowerCase() !== user) return new Set();
  let seen: Seen | null;
  try {
    seen = readStoredJson(StorageKey.medalsSeen, SeenSchema);
  } catch {
    // A blocked storage: nothing could have been seen, so nothing is new.
    return new Set();
  }
  const fresh = freshMedals(list, seen?.user === user ? seen : null);
  writeStoredJson(StorageKey.medalsSeen, seenNow(user, list));
  return fresh;
}

async function addMedals(profile: HTMLElement, name: string): Promise<void> {
  const user = await profileUser(name);
  if (!user) return;
  const list = medals(user, Date.now());
  const section = createElement('section', { className: 'ln-ext-medals' });
  setHtml(section, medalsMarkup(list, takeFresh(name, list)));
  profile.after(section);
}

export function syncMedals(): void {
  const profile = queryOne(
    document,
    '.user-show > #us_profile:not([data-ln-ext-medals])',
    HTMLElement,
  );
  const name = profile && profileName();
  if (!profile || !name) return;
  setData(profile, 'lnExtMedals', '');
  void addMedals(profile, name);
}

export const profileMedals: Feature = {
  name: 'medals',
  start: () => onEveryTick('medals', syncMedals),
};
