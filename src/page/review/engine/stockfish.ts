import type { EngineKind } from '#shared/review-engine/options.ts';
import {
  INITIAL_PAGES,
  isFactory,
  isStockfishModule,
  networkNames,
  setUp,
  type StockfishModule,
} from './module.ts';
import { hasRelaxedSimd } from './relaxed-simd.ts';
import { FULL_SEARCH, type SearchLimits, STOCKFISH_BUILD, stockfishScript } from './settings.ts';
import { assetUrl } from '#page/lichess/assets.ts';
import { type EngineResult, SearchCollector } from './uci.ts';

// Lichess's Stockfish build (stockfish-web), loaded from its own assets in the
// page world. An engine runs one search at a time: the others queue behind it.

// How long an engine may say nothing in a search before it's given up. A
// search keeps sending lines, late on a busy machine: there a 250 ms one took
// 9 s, its first line 5 s in.
const SILENCE_MS = 10_000;

// Some browsers refuse a large shared memory: ask for less until they agree.
function sharedMemory(engine: EngineKind): WebAssembly.Memory {
  const initial = INITIAL_PAGES[engine];
  for (let maximum = 32767; ; maximum = Math.ceil(maximum * 0.75)) {
    try {
      return new WebAssembly.Memory({ shared: true, initial, maximum });
    } catch (error) {
      if (maximum <= initial || !(error instanceof RangeError)) throw error;
    }
  }
}

// Every engine of the page takes the same networks: each is fetched once.
const networks = new Map<string, Promise<Uint8Array<ArrayBuffer>>>();

async function network(name: string): Promise<Uint8Array<ArrayBuffer>> {
  let buffer = networks.get(name);
  if (!buffer) {
    buffer = fetch(assetUrl(`lifat/nnue/${name}`)).then(
      async response => new Uint8Array(await response.arrayBuffer()),
    );
    networks.set(name, buffer);
    // A failed download is tried again by the next engine.
    buffer.catch(() => networks.delete(name));
  }
  return buffer;
}

async function loadNetworks(module: StockfishModule): Promise<void> {
  for (const [i, name] of networkNames(module).entries())
    module.setNnueBuffer(await network(name), i);
}

async function loadModule(engine: EngineKind): Promise<StockfishModule> {
  const { root } = STOCKFISH_BUILD;
  const script = stockfishScript(hasRelaxedSimd(), engine);
  const url = assetUrl(`${root}/${script}`, { documentOrigin: true });
  const wasmMemory = sharedMemory(engine);
  const imported: unknown = await import(url);
  if (!isFactory(imported)) throw new Error('Stockfish did not load');
  const module: unknown = await imported.default({
    wasmMemory,
    locateFile: (file: string) => assetUrl(`${root}/${file}`),
    mainScriptUrlOrBlob: url,
  });
  if (!isStockfishModule(module)) throw new Error('Stockfish has an unexpected shape');
  return module;
}

export interface EngineSearch {
  /** What follows `position`: `fen …`, and the moves leading to it (`uciPosition`). */
  readonly position: string;
  readonly limits?: SearchLimits;
  /** Only the lines that start with these moves. */
  readonly searchMoves?: readonly string[];
}

export interface StockfishOptions {
  readonly chess960: boolean;
  /** The light network unless given, with one thread and a 16 MB table. */
  readonly engine?: EngineKind;
  readonly threads?: number;
  readonly hash?: number;
}

export class Stockfish {
  readonly #chess960: boolean;
  readonly #engine: EngineKind;
  readonly #threads: number;
  readonly #hash: number;
  #module: StockfishModule | null = null;
  #onLine: ((text: string) => void) | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(options: StockfishOptions) {
    this.#chess960 = options.chess960;
    this.#engine = options.engine ?? 'light';
    this.#threads = options.threads ?? 1;
    this.#hash = options.hash ?? 16;
  }

  async boot(): Promise<void> {
    const module = await loadModule(this.#engine);
    await loadNetworks(module);
    Object.assign(module, { listen: (text: string) => this.#onLine?.(text) });
    this.#module = module;
    setUp(module, { threads: this.#threads, hash: this.#hash, chess960: this.#chess960 });
  }

  /** Booted, and still answering. */
  get running(): boolean {
    return this.#module !== null;
  }

  /** The engine's two best lines for a position, from the side to move's view. */
  analyse(search: EngineSearch): Promise<EngineResult> {
    const result = this.#queue.then(() => this.#run(search));
    // A failed search doesn't hold up the ones queued behind it.
    this.#queue = result.catch(() => undefined);
    return result;
  }

  /** Ends the engine: its worker stops, and its searches fail from now on. */
  quit(): void {
    this.#module?.uci('quit');
    this.#module = null;
    this.#onLine = null;
  }

  #run({ position, limits = FULL_SEARCH, searchMoves = [] }: EngineSearch): Promise<EngineResult> {
    return new Promise((resolve, reject) => {
      const module = this.#module;
      if (!module) throw new Error('Stockfish is not running');
      const collector = new SearchCollector();
      // A deep search may think longer between two lines.
      const silence = Math.max(SILENCE_MS, limits.movetime / 2);
      // An engine silent that long is in trouble: its result would be cut
      // short, so the search fails, to be done again, and the engine is ended.
      let timer = 0;
      let heardAt = 0;
      const listen = (): void => {
        clearTimeout(timer);
        heardAt = Date.now();
        timer = window.setTimeout(giveUp, silence);
      };
      const giveUp = (): void => {
        // Far later by the clock: the machine slept, the search with it.
        if (Date.now() - heardAt > silence * 2) {
          listen();
          return;
        }
        module.uci('stop');
        this.quit();
        reject(new Error('Stockfish stopped answering'));
      };
      listen();
      this.#onLine = text => {
        listen();
        const result = collector.read(text);
        if (!result) return;
        clearTimeout(timer);
        this.#onLine = null;
        resolve(result);
      };
      // A table left by the last search changes this one's line and score, and
      // which engine searched what before varies: cleared, a position always
      // gets the same verdict.
      module.uci('ucinewgame');
      module.uci(`position ${position}`);
      // `searchmoves` takes the rest of the command: it goes last.
      const only = searchMoves.length > 0 ? ` searchmoves ${searchMoves.join(' ')}` : '';
      module.uci(`go depth ${limits.depth} movetime ${limits.movetime}${only}`);
    });
  }
}
