import type { Feature } from '#shared/features.ts';
import { PIECE_NAMES, pieceVariable } from '#shared/packs/pack.ts';
import {
  onLichessLook,
  onLichessLookPreview,
  onLooksPreview,
  type LichessLookPick,
  type LichessLookPreview,
} from '#shared/protocol.ts';
import { assetUrl, isHashedAsset } from '#page/lichess/assets.ts';
import { soundPlayer } from '#page/lichess/sound.ts';
import { createPreview } from './preview.ts';

// Lichess's boards, piece sets and sound sets picked in the extension's
// settings are set as its user menu sets them (lila's ui/dasher): named on
// <body> for this page, and saved in the user's preferences for the others.
// A sound set is switched to at once, heard on the settings' preview board,
// which is drawn here too (preview.ts). A board or set whose tile is hovered
// is shown the same way, unsaved, until the pointer leaves it.

const PREFS: Readonly<Record<LichessLookPick['part'], { field: string; data: string }>> = {
  board: { field: 'theme', data: 'board' },
  piece: { field: 'pieceSet', data: 'pieceSet' },
  sound: { field: 'soundSet', data: 'soundSet' },
};

async function savePref(field: string, id: string): Promise<void> {
  try {
    const response = await fetch(`/pref/${field}`, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: new URLSearchParams({ [field]: id }),
    });
    if (!response.ok) console.warn(`[LichessNeo] ${field} unsaved`, response.status);
  } catch (error) {
    console.warn(`[LichessNeo] ${field} unsaved`, error);
  }
}

// As lila's menu does: each piece's variable inline on <body>, in WebP for the sets it has so.
function showPieceSet(set: string): void {
  const extension = isHashedAsset(`piece/${set}/wP.webp`) ? 'webp' : 'svg';
  for (const name of PIECE_NAMES)
    document.body.style.setProperty(
      pieceVariable(name),
      `url(${assetUrl(`piece/${set}/${name}.${extension}`)})`,
    );
}

function showLook(part: LichessLookPreview['part'], id: string | undefined): void {
  const { data } = PREFS[part];
  if (id === undefined) delete document.body.dataset[data];
  else document.body.dataset[data] = id;
  if (part !== 'piece') return;
  if (id === undefined)
    for (const name of PIECE_NAMES) document.body.style.removeProperty(pieceVariable(name));
  else showPieceSet(id);
}

// The part's pick while a hovered tile stands in for it.
let kept: { readonly part: LichessLookPreview['part']; readonly id: string | undefined } | null =
  null;

export function previewLichessLook({ part, id }: LichessLookPreview): void {
  if (kept && kept.part !== part) previewLichessLook({ part: kept.part, id: null });
  if (id === null) {
    if (kept) showLook(kept.part, kept.id);
    kept = null;
    return;
  }
  kept ??= { part, id: document.body.dataset[PREFS[part].data] };
  showLook(part, id);
}

export function pickLichessLook({ part, id }: LichessLookPick): void {
  const { field, data } = PREFS[part];
  // Picked, it stays once the pointer leaves.
  if (kept?.part === part) kept = null;
  void savePref(field, id);
  document.body.dataset[data] = id;
  if (part === 'piece') showPieceSet(id);
  if (part === 'sound') soundPlayer()?.changeSet?.(id);
}

export const lichessLooks: Feature = {
  name: 'lichess looks',
  start: () => {
    onLichessLook(pickLichessLook);
    onLichessLookPreview(previewLichessLook);
    onLooksPreview(createPreview());
  },
};
