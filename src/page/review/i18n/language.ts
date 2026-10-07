import { isFrench } from '#shared/lang.ts';
import { en, english } from './en.ts';
import { french, fr } from './fr.ts';
import type { ReviewLanguage, Viewer } from './types.ts';

/**
 * The review's language: French on a French page, English otherwise, the
 * coach speaking to `viewer` of their own moves.
 */
export function pageLanguage(viewer: Viewer = null): ReviewLanguage {
  if (viewer === null) return isFrench() ? fr : en;
  return isFrench() ? french(viewer) : english(viewer);
}
