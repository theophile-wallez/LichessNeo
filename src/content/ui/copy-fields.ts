import { queryAll } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Back on a page, Chrome refills its fields that have neither a form nor a
// name in their order, from the values that were changed. Lichess fills its
// copy fields (a game's FEN) by script, so the FEN was the first saved and
// landed in the search box, the first such field: the box only gets its
// `autocomplete="off"` from Lichess's script, after the refill. On the copy
// fields, it keeps their values from being saved.

const UNMARKED = 'input.copy-me__target:not([autocomplete])';

export function keepCopyFieldsUnsaved(): void {
  for (const field of queryAll(document, UNMARKED, HTMLInputElement)) field.autocomplete = 'off';
}

export const copyFields: Feature = {
  name: 'copy fields',
  start: () => onEveryTick('copy fields', keepCopyFieldsUnsaved),
};
