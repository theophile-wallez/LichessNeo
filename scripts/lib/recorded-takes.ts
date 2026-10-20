import { RECORDED_SET, recordedTakePaths } from '#shared/recorded-sounds.ts';

// The Boxwood set's takes are named by count (RECORDED_TAKES), not listed: a
// take missing from the build would only fail in the background worker, and a
// stray one would weigh on it for nothing. The build fails on either instead.

export const RECORDED_FOLDER = `sounds/${RECORDED_SET}`;

/** Throws unless `files`, the build's recorded set folder, holds every take and nothing else. */
export function assertRecordedTakes(files: readonly string[]): void {
  const expected = new Set([...recordedTakePaths().values()].flat());
  const found = new Set(files.map(file => `${RECORDED_FOLDER}/${file}`));
  const missing = [...expected].filter(file => !found.has(file));
  const extra = [...found].filter(file => !expected.has(file));
  if (missing.length > 0) throw new Error(`recorded takes missing: ${missing.join(', ')}`);
  if (extra.length > 0) throw new Error(`files not in RECORDED_TAKES: ${extra.join(', ')}`);
}
