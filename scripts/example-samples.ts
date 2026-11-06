// Writes packs/samples: the example pack's pieces and sounds in other
// formats, and boards in PNG, JPEG and WebP, to show what the settings' Packs
// card takes. Run it by hand (`node scripts/example-samples.ts`); it needs
// Playwright's Chromium, to draw, and ffmpeg, to encode the sounds.

import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { z } from 'zod/mini';
import { fromRoot } from './lib/paths.ts';

const EXAMPLE = fromRoot('packs/example');
const OUT = fromRoot('packs/samples');
const PIECE_SIZE = 256;
const BOARD_SIZE = 800;

/** A board: its two colors, and how much grain runs through its squares. */
interface Board {
  readonly file: string;
  readonly light: string;
  readonly dark: string;
  readonly grain: number;
}

const BOARDS: readonly Board[] = [
  { file: 'maple.png', light: '#f3e3c3', dark: '#b98a5a', grain: 0.18 },
  { file: 'harbor.jpg', light: '#e3ecf2', dark: '#6f8fae', grain: 0.06 },
  { file: 'mint.webp', light: '#e8f0e4', dark: '#7fa58a', grain: 0.1 },
];

const TYPES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

const dataBytes = (url: string): Buffer => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

async function write(file: string, data: Buffer | string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

// Run in the page, as text: the scripts' types have no DOM.
const DRAW_PIECE = `async ({ svg, size }) => {
  const image = new Image();
  image.src = 'data:image/svg+xml;base64,' + btoa(svg);
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d').drawImage(image, 0, 0, size, size);
  return [canvas.toDataURL('image/png'), canvas.toDataURL('image/webp', 0.9)];
}`;

// Seeded, so the same board comes out each time.
const DRAW_BOARD = `({ board, size, type }) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const square = size / 8;
  for (let rank = 0; rank < 8; rank++)
    for (let file = 0; file < 8; file++) {
      context.fillStyle = (rank + file) % 2 === 0 ? board.light : board.dark;
      context.fillRect(file * square, rank * square, square, square);
      for (let line = 0; line < 14; line++) {
        context.fillStyle = 'rgba(80, 50, 20, ' + board.grain * random() + ')';
        context.fillRect(file * square, rank * square + random() * square, square, 1 + random() * 2);
      }
    }
  return canvas.toDataURL(type, 0.9);
}`;

const run = async <T>(
  page: Page,
  source: string,
  input: unknown,
  schema: z.ZodMiniType<T>,
): Promise<T> => schema.parse(await page.evaluate(`(${source})(${JSON.stringify(input)})`));

const browser = await chromium.launch();
const page = await browser.newPage();

for (const name of (await readdir(path.join(EXAMPLE, 'pieces'))).filter(file =>
  file.endsWith('.svg'),
)) {
  const svg = await readFile(path.join(EXAMPLE, 'pieces', name), 'utf8');
  const [png = '', webp = ''] = await run(
    page,
    DRAW_PIECE,
    { svg, size: PIECE_SIZE },
    z.array(z.string()),
  );
  const base = name.replace(/\.svg$/, '');
  await write(path.join(OUT, 'pieces-png', `${base}.png`), dataBytes(png));
  await write(path.join(OUT, 'pieces-webp', `${base}.webp`), dataBytes(webp));
}

for (const board of BOARDS) {
  const type = TYPES[board.file.slice(board.file.lastIndexOf('.') + 1)] ?? 'image/png';
  const url = await run(page, DRAW_BOARD, { board, size: BOARD_SIZE, type }, z.string());
  await write(path.join(OUT, 'boards', board.file), dataBytes(url));
}
await browser.close();

const sounds = (await readdir(path.join(EXAMPLE, 'sounds'))).filter(file => file.endsWith('.wav'));
for (const [folder, extension, codec] of [
  ['sounds-mp3', 'mp3', ['-codec:a', 'libmp3lame', '-q:a', '4']],
  ['sounds-ogg', 'ogg', ['-codec:a', 'libvorbis', '-q:a', '4']],
] as const) {
  await mkdir(path.join(OUT, folder), { recursive: true });
  for (const sound of sounds) {
    const out = path.join(OUT, folder, sound.replace(/\.wav$/, `.${extension}`));
    // No metadata, so the same take encodes to the same file.
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      path.join(EXAMPLE, 'sounds', sound),
      '-map_metadata',
      '-1',
      ...codec,
      '-fflags',
      '+bitexact',
      out,
    ]);
  }
}
console.log('Wrote packs/samples.');
