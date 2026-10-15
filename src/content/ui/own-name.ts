import type { Feature } from '#shared/features.ts';
import { onOwnName, ownName } from '#shared/own-name.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The name the signed-in user picked for themselves (#shared/own-name.ts), in
// place of theirs where Lichess writes it: the links to their profile (player
// bars, chats, cards, lists…), their profile's title and the top bar's menu.
// Only the text that is their name changes, and back as they drop the pick.
// Lichess redraws some of it, writing the name again: the next tick puts ours back.

// Each text that held the name: as Lichess wrote it, and as we did.
const renamedTexts = new WeakMap<Text, { readonly original: string; readonly written: string }>();

// Lichess names the user on <body> by id, which is word characters and hyphens only.
const USER_ID = /^[\w-]+$/;

function spotsOf(user: string): string {
  const profile = `/@/${user}`;
  return [
    `a[href$='${profile}' i]`,
    `a[href*='${profile}/' i]`,
    `a[href*='${profile}?' i]`,
    `[data-href$='${profile}' i]`,
    '#user_tag',
  ].join(', ');
}

function rename(text: Text, real: string, shown: string): void {
  const ours = renamedTexts.get(text);
  // Lichess's name, new or written again; else ours, unless Lichess wrote something else since.
  const isReal = text.data.trim().toLowerCase() === real.toLowerCase();
  const original = isReal ? text.data : ours?.written === text.data && ours.original;
  if (!original) return;
  const written = original.replace(original.trim(), () => shown);
  renamedTexts.set(text, { original, written });
  if (text.data !== written) text.data = written;
}

function renameIn(spot: Element, real: string, shown: string): void {
  const walker = document.createTreeWalker(spot, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    if (node instanceof Text) rename(node, real, shown);
}

let renamed = false;

export function syncOwnName(): void {
  const { user, username } = document.body?.dataset ?? {};
  if (user === undefined || username === undefined || !USER_ID.test(user)) return;
  const shown = ownName();
  // With no pick, only the texts renamed before have anything to go back to.
  if (shown === null && !renamed) return;
  renamed = shown !== null;
  for (const spot of document.querySelectorAll(spotsOf(user)))
    renameIn(spot, username, shown ?? username);
}

export const ownNameFeature: Feature = {
  name: 'own name',
  start: () => {
    onOwnName(() => {
      renamed = true;
      syncOwnName();
    });
    onEveryTick('own name', syncOwnName);
  },
};
