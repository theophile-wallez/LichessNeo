import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createZip, readZip } from './zip.ts';

const text = (data: string): Uint8Array => new TextEncoder().encode(data);

const zipped = async (files: Record<string, Uint8Array>): Promise<Uint8Array> =>
  new Uint8Array(
    await createZip(Object.entries(files).map(([path, data]) => ({ path, data }))).arrayBuffer(),
  );

describe('readZip', () => {
  it('gives back what createZip zipped, in the folder asked', async () => {
    const files = readZip(
      await zipped({ 'pack.json': text('{}'), 'pieces/wK.svg': text('<svg/>') }),
      'mine/',
    );
    expect(files.map(file => file.path).toSorted()).toEqual([
      'mine/pack.json',
      'mine/pieces/wK.svg',
    ]);
    const king = files.find(file => file.path.endsWith('wK.svg'));
    expect(king && new TextDecoder().decode(await king.read())).toBe('<svg/>');
  });

  it("leaves out what isn't the user's", async () => {
    const files = readZip(
      await zipped({
        'board.png': text('x'),
        '__MACOSX/._board.png': text('x'),
        '.DS_Store': text('x'),
      }),
    );
    expect(files.map(file => file.path)).toEqual(['board.png']);
  });

  it('refuses a file that unpacks to more than a pack may hold', () => {
    const big = new Uint8Array(3 * 1024 * 1024);
    expect(() => readZip(zipSync({ 'board.png': big }))).toThrow('board.png');
  });

  it('skips a big file a pack has no use for', () => {
    const big = new Uint8Array(3 * 1024 * 1024);
    expect(
      readZip(zipSync({ 'notes.txt': big, 'board.png': text('x') })).map(file => file.path),
    ).toEqual(['board.png']);
  });

  it('says a broken zip could not be read', () => {
    expect(() => readZip(text('not a zip'))).toThrow('The zip could not be read.');
  });
});
