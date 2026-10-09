import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bundleCss } from './css-bundle.ts';
import { tempDirs, writeFiles } from './testing.ts';

const newDir = tempDirs('lr-ext-css-');

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await newDir();
  await writeFiles(dir, files);
  return dir;
}

describe('bundleCss', () => {
  it('inlines imports in order, byte for byte', async () => {
    const dir = await fixture({
      'index.css': "@import './a.css';\n@import './b/index.css';\n",
      'a.css': '.a { color: red; }\n',
      'b/index.css': "@import './c.css';\n.b {}\n",
      'b/c.css': '/* c */\n.c {}\n',
    });
    expect(await bundleCss(path.join(dir, 'index.css'))).toBe(
      '.a { color: red; }\n/* c */\n.c {}\n.b {}\n',
    );
  });

  it('refuses imports it would not inline', async () => {
    const dir = await fixture({ 'index.css': "@import url('https://example.com/x.css');\n" });
    await expect(bundleCss(path.join(dir, 'index.css'))).rejects.toThrow(/unsupported @import/);
  });

  it('refuses circular imports', async () => {
    const dir = await fixture({ 'a.css': "@import './b.css';\n", 'b.css': "@import './a.css';\n" });
    await expect(bundleCss(path.join(dir, 'a.css'))).rejects.toThrow(/circular/);
  });
});
