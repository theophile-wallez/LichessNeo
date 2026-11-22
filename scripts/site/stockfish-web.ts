// Lichess's own engine, the build the review runs in the browser
// (stockfish-web's light network, STOCKFISH_BUILD), run in Node for the site
// demo's recording: the same evaluations, so the demo's verdicts are the
// extension's. Its files are downloaded from Lichess's assets into a folder
// of their own, as the page loads them.

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  INITIAL_PAGES,
  isFactory,
  isStockfishModule,
  networkNames,
  setUp,
  type StockfishModule,
} from '#page/review/engine/module.ts';
import { type SearchLimits, STOCKFISH_BUILD } from '#page/review/engine/settings.ts';
import { type EngineResult, SearchCollector } from '#page/review/engine/uci.ts';

const ASSETS = 'https://lichess1.org/assets';

async function download(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function loadModule(folder: string): Promise<StockfishModule> {
  const script = STOCKFISH_BUILD.script;
  const wasm = script.replace(/\.js$/, '.wasm');
  for (const file of [script, wasm])
    await writeFile(
      join(folder, file),
      await download(`${ASSETS}/${STOCKFISH_BUILD.root}/${file}`),
    );
  const imported: unknown = await import(pathToFileURL(join(folder, script)).href);
  if (!isFactory(imported)) throw new Error('Stockfish did not load');
  const module: unknown = await imported.default({
    wasmMemory: new WebAssembly.Memory({
      shared: true,
      initial: INITIAL_PAGES.light,
      maximum: 32767,
    }),
    locateFile: (file: string) => join(folder, file),
  });
  if (!isStockfishModule(module)) throw new Error('Stockfish has an unexpected shape');
  for (const [i, name] of networkNames(module).entries())
    module.setNnueBuffer(await download(`${ASSETS}/lifat/nnue/${name}`), i);
  return module;
}

/** One engine, one command at a time, set up as the review's (`Stockfish`). */
export class WebStockfish {
  readonly #module: StockfishModule;
  readonly #folder: string;
  #onLine: ((text: string) => void) | null = null;

  private constructor(module: StockfishModule, folder: string) {
    this.#module = module;
    this.#folder = folder;
    Object.assign(module, { listen: (text: string) => this.#onLine?.(text) });
    setUp(module, { threads: 1, hash: 16, chess960: false });
  }

  static async boot(): Promise<WebStockfish> {
    const folder = await mkdtemp(join(tmpdir(), 'stockfish-web-'));
    return new WebStockfish(await loadModule(folder), folder);
  }

  /** Sends `command`, then hands each line of output to `read` until it returns a value. */
  #ask<T>(command: string, read: (line: string) => T | null): Promise<T> {
    const answer = new Promise<T>(resolve => {
      this.#onLine = line => {
        const value = read(line);
        if (value === null) return;
        this.#onLine = null;
        resolve(value);
      };
    });
    this.#module.uci(command);
    return answer;
  }

  /** A search from an empty table, as the review's are. */
  search(position: string, limits: SearchLimits): Promise<EngineResult> {
    this.#module.uci('ucinewgame');
    this.#module.uci(`position ${position}`);
    const collector = new SearchCollector();
    return this.#ask(`go depth ${limits.depth} movetime ${limits.movetime}`, line =>
      collector.read(line),
    );
  }

  /** The FEN the engine reaches after `position`, as its `d` prints it. */
  fen(position: string): Promise<string> {
    this.#module.uci(`position ${position}`);
    return this.#ask('d', line => (line.startsWith('Fen: ') ? line.slice(5) : null));
  }

  async quit(): Promise<void> {
    this.#module.uci('quit');
    await rm(this.#folder, { recursive: true, force: true });
  }
}
