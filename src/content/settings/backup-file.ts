import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { PackSchema, type Pack } from '#shared/packs/pack.ts';
import type { StorageKey } from '#shared/storage.ts';
import { SettingsSchema, type Settings } from './settings.ts';

// A backup of the extension's settings, as a file the user keeps or shares:
// the synced settings, the picks kept in the page's storage, and the imported
// packs whole, since the links they came from may be private or gone.

const FORMAT = 'lichess-neo-settings';

/**
 * The picks kept in the page's storage, by their name in StorageKey, and opening practice's
 * records. Not the caches, nor the settings' copies, which the settings write again as they
 * change, nor practice's link to its studies, which are the account's, not the browser's.
 */
export const BACKED_UP_KEYS = [
  'board',
  'pieces',
  'sounds',
  'soundPlace',
  'backlitLight',
  'backlitReach',
  'backlitWaves',
  'backlitGap',
  'backlitRadius',
  'customBoard',
  'blackPieces',
  'savedBoards',
  'coach',
  'homeCoach',
  'avatar',
  'name',
  'boardZoom',
  'sidebarCollapsed',
  'ratingChartRange',
  'endCardFolded',
  'practiceSettings',
  'practiceRepertoire',
  'practiceProgress',
] as const satisfies readonly (keyof typeof StorageKey)[];

/** Records rather than picks: one a backup lacks (made before they were in) is kept, not reset. */
export const KEPT_UNLESS_BACKED_UP: ReadonlySet<string> = new Set([
  'practiceSettings',
  'practiceRepertoire',
  'practiceProgress',
] satisfies (typeof BACKED_UP_KEYS)[number][]);

// Each value is checked where it's read, as anything in the storage is: here only its size.
const MAX_STORED_LENGTH = 1_000_000;

const BackupSchema = z.object({
  format: z.literal(FORMAT),
  version: z.literal(1),
  created: z.iso.datetime(),
  /** The version of the extension that made it. */
  extension: z.string(),
  settings: SettingsSchema,
  stored: z.partialRecord(z.enum(BACKED_UP_KEYS), z.string().check(z.maxLength(MAX_STORED_LENGTH))),
  packs: z.array(PackSchema),
});

export type Backup = z.infer<typeof BackupSchema>;

export interface BackupParts {
  readonly settings: Settings;
  readonly stored: Backup['stored'];
  readonly packs: readonly Pack[];
  readonly extension: string;
  readonly created: Date;
}

export const makeBackup = ({
  settings,
  stored,
  packs,
  extension,
  created,
}: BackupParts): Backup => ({
  format: FORMAT,
  version: 1,
  created: created.toISOString(),
  extension,
  settings,
  stored,
  packs: [...packs],
});

/** The backup a file holds, or null if it isn't one. */
export const readBackup = (text: string): Backup | null => parseJson(text, BackupSchema);

const twoDigits = (value: number): string => String(value).padStart(2, '0');

/** The file's name, dated in the user's time zone. */
export const backupFileName = (date: Date): string =>
  `lichess-neo-settings-${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}.json`;
