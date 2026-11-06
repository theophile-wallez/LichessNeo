import { hasPart, PART_KINDS, type Pack, type PartKind } from './pack.ts';

// The user's own files, kept item by item: a board, a piece set or a sound
// set each, under a name of their own that they can change. Their id isn't
// made of that name, so a renamed item stays picked. Files dropped under an
// item's name again take its place, a sound at a time for a sound set, so a
// theme can be tried and changed.

const FILE = 'file:';
const MAX_NAME = 40;

/** A new item's id: a path, as every pack's is (content/packs/library.ts). */
export const newItemId = (): string => `${FILE}${crypto.randomUUID()}/`;

export const isFileItem = (pack: Pack): boolean => pack.id.startsWith(FILE);

/** The one part an item has. */
export const kindOf = (pack: Pack): PartKind | undefined =>
  PART_KINDS.find(kind => hasPart(pack, kind));

/** The pack's part of that kind alone, under the pack's name. */
export function onlyPart(pack: Pack, kind: PartKind): Pack {
  const { id, name, link, board, pieces, sounds } = pack;
  return {
    id,
    name,
    link,
    ...(kind === 'board' && board && { board }),
    ...(kind === 'piece' && pieces && { pieces }),
    ...(kind === 'sound' && sounds && { sounds }),
  };
}

/** The user's own item of that kind and name, in any case, which an import of it replaces. */
export const itemNamed = (
  packs: readonly Pack[],
  { kind, name }: { readonly kind: PartKind; readonly name: string },
): Pack | undefined =>
  packs.find(
    item =>
      isFileItem(item) &&
      kindOf(item) === kind &&
      item.name.toLowerCase() === name.trim().toLowerCase(),
  );

interface Stored {
  readonly stored: readonly Pack[];
  readonly newId: () => string;
}

/** The items the dropped packs make, each in place of the stored one of its kind and name. */
export function fileItems(dropped: readonly Pack[], { stored, newId }: Stored): Pack[] {
  return dropped.flatMap(pack => {
    const kind = kindOf(pack);
    if (kind === undefined) return [];
    const old = itemNamed(stored, { kind, name: pack.name });
    const item = { ...onlyPart(pack, kind), id: old?.id ?? newId() };
    if (kind !== 'sound' || !old?.sounds) return [item];
    return [{ ...item, sounds: { ...old.sounds, ...item.sounds } }];
  });
}

/** The item under its new name, or null for a name that's empty once trimmed. */
export function renamed(item: Pack, name: string): Pack | null {
  const trimmed = name.trim().slice(0, MAX_NAME);
  return trimmed === '' ? null : { ...item, name: trimmed };
}
