import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';
import { hasRelaxedSimd } from './relaxed-simd.ts';
import { FULL_SEARCH, type SearchLimits, STOCKFISH_BUILD, stockfishScript } from './settings.ts';
import { assetUrl } from '#page/lichess/assets.ts';
import { type EngineResult, SearchCollector } from './uci.ts';

// Lichess's Stockfish build (stockfish-web), loaded from its own assets in the
// page world. An engine runs one search at a time: the others queue behind it.

const FactorySchema = z.object({
  default: z.function({ input: [z.unknown()], output: z.unknown() }),
});

const StockfishModuleSchema = z.object({
  uci: z.function({ input: [z.string()], output: z.unknown() }),
  getRecommendedNnue: z.function({ input: [z.number()], output: z.unknown() }),
  setNnueBuffer: z.function({ input: [z.instanceof(Uint8Array), z.number()], output: z.unknown() }),
});

type StockfishModule = z.infer<typeof StockfishModuleSchema>;

const isFactory = createGuard(FactorySchema);
const isStockfishModule = createGuard(StockfishModuleSchema);

const INITIAL_PAGES = 1536;

// How long an engine may say nothing in a search before it's given up. A
// search keeps sending lines, late on a busy machine: there a 250 ms one took
// 9 s, its first line 5 s in.
const SILENCE_MS = 10_000;

// Some browsers refuse a large shared memory: ask for less until they agree.
function sharedMemory(): WebAssembly.Memory {
  for (let maximum = 32767; ; maximum = Math.ceil(maximum * 0.75)) {
    try {
      return new WebAssembly.Memory({ shared: true, initial: INITIAL_PAGES, maximum });
    } catch (error) {
      if (maximum <= INITIAL_PAGES || !(error instanceof RangeError)) throw error;
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
  for (let i = 0; ; i++) {
    const name = module.getRecommendedNnue(i);
    if (typeof name !== 'string' || name === '') return;
    module.setNnueBuffer(await network(name), i);
  }
}

async function loadModule(): Promise<StockfishModule> {
  const { root } = STOCKFISH_BUILD;
  const url = assetUrl(`${root}/${stockfishScript(hasRelaxedSimd())}`, { documentOrigin: true });
  const wasmMemory = sharedMemory();
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
}

export class Stockfish {
  readonly #chess960: boolean;
  #module: StockfishModule | null = null;
  #onLine: ((text: string) => void) | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(options: StockfishOptions) {
    this.#chess960 = options.chess960;
  }

  async boot(): Promise<void> {
    const module = await loadModule();
    await loadNetworks(module);
    Object.assign(module, { listen: (text: string) => this.#onLine?.(text) });
    this.#module = module;
    module.uci('uci');
    // One thread each: the review's short searches reach their depth several
    // times sooner on one thread than on four, so the page runs several engines.
    module.uci('setoption name Threads value 1');
    // The review's searches are short: a small table does as well, and weighs
    // less with several engines on the page.
    module.uci('setoption name Hash value 16');
    module.uci('setoption name MultiPV value 2');
    if (this.#chess960) module.uci('setoption name UCI_Chess960 value true');
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
      // An engine silent that long is in trouble: its result would be cut
      // short, so the search fails, to be done again, and the engine is ended.
      let timer = 0;
      let heardAt = 0;
      const listen = (): void => {
        clearTimeout(timer);
        heardAt = Date.now();
        timer = window.setTimeout(giveUp, SILENCE_MS);
      };
      const giveUp = (): void => {
        // Far later by the clock: the machine slept, the search with it.
        if (Date.now() - heardAt > SILENCE_MS * 2) {
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
