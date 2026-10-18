import { z } from 'zod/mini';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoredRecordCodec } from '#page/review/evaluation/stored.ts';
import { CloudEvalSchema, fromCloud } from './cloud.ts';
import { toRecord } from './record.ts';
import { FULL_SEARCH, QUICK_SEARCH, STOCKFISH_BUILD } from './settings.ts';
import { Stockfish } from './stockfish.ts';
import { parseUciOutput, SearchCollector } from './uci.ts';
// What the original script read from the engine and the cloud.
import legacy from './fixtures/legacy-engine.json' with { type: 'json' };
import legacyRecords from './fixtures/legacy-records.json' with { type: 'json' };

const LineSchema = z.union([
  z.object({ mate: z.number(), pv: z.array(z.string()) }),
  z.object({ cp: z.number(), pv: z.array(z.string()) }),
]);
const ResultSchema = z.object({ lines: z.array(LineSchema) });
const SamplesSchema = z.array(
  z.object({ fen: z.string(), result: ResultSchema, record: StoredRecordCodec }),
);
// A record as the original wrote it.
const stored = (record: z.infer<typeof StoredRecordCodec>): string =>
  JSON.stringify(z.encode(StoredRecordCodec, record));

describe('UCI output', () => {
  it('collects the lines the original collected', () => {
    for (const { lines, result } of legacy.outputs) {
      const collector = new SearchCollector();
      const results = lines.map(line => collector.read(line));
      expect(results.slice(0, -1).every(partial => partial === null)).toBe(true);
      // The original kept the final best move too, which nothing read.
      expect(results.at(-1)).toEqual({ lines: result.lines });
    }
  });

  it('ignores what isn’t a scored line', () => {
    expect(parseUciOutput('info depth 3 currmove e2e4')).toBeNull();
    expect(parseUciOutput('info depth 3 score cp 20 lowerbound pv e2e4')).toBeNull();
    expect(parseUciOutput('info depth 3 score wdl 1 2 3 pv e2e4')).toBeNull();
    expect(parseUciOutput('readyok')).toBeNull();
    expect(parseUciOutput('bestmove e2e4 ponder e7e5')).toEqual({ kind: 'bestmove' });
  });
});

describe('toRecord', () => {
  it('turns engine results into the original’s records', () => {
    const samples = SamplesSchema.parse([...legacyRecords, ...legacy.records]);
    for (const { fen, result, record } of samples) {
      // Through JSON, as the fixtures went (and as the cache stores records):
      // -0 and 0 alike.
      expect(stored(toRecord(fen, result))).toBe(stored(record));
    }
  });
});

describe('fromCloud', () => {
  it('reads the cloud as the original did', () => {
    for (const { fen, payload, result, record } of legacy.clouds) {
      const lines = fromCloud(fen, CloudEvalSchema.parse(payload));
      expect(lines).toEqual(result);
      if (!lines) throw new Error(`no lines for ${fen}`);
      expect(toRecord(fen, lines)).toEqual(StoredRecordCodec.parse(record));
    }
  });

  it('counts an empty answer as a miss', () => {
    const fen = '8/8/8/8/8/8/8/K6k w - - 0 1';
    expect(fromCloud(fen, CloudEvalSchema.parse({}))).toBeNull();
    expect(fromCloud(fen, CloudEvalSchema.parse({ pvs: [] }))).toBeNull();
    expect(CloudEvalSchema.safeParse({ pvs: [{ moves: 'e2e4' }] }).success).toBe(false);
  });
});

describe('settings', () => {
  it('search as deep as the original, with more time to get there', () => {
    const { engine, quick } = legacy.settings;
    expect(STOCKFISH_BUILD).toEqual({ root: engine.root, script: engine.js });
    expect(FULL_SEARCH.depth).toBe(engine.depth);
    expect(QUICK_SEARCH.depth).toBe(quick.depth);
    expect(FULL_SEARCH.movetime).toBeGreaterThan(engine.movetime);
    expect(QUICK_SEARCH.movetime).toBeGreaterThan(quick.movetime);
  });
});

// A stand-in for stockfish-web: it answers each search with one line.
const FAKE_MODULE = `export default async options => globalThis.lnExtFakeStockfish(options);`;

describe('Stockfish', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'site');
    Reflect.deleteProperty(globalThis, 'lnExtFakeStockfish');
  });

  it('boots Lichess’s build and runs one search at a time', async () => {
    const sent: string[] = [];
    const urls: string[] = [];
    const factory = vi.fn<() => unknown>(() => {
      const module = {
        listen: (_text: string): void => {},
        uci: (command: string): void => {
          sent.push(command);
          const match = /^position fen (.+)$/.exec(command);
          if (match)
            queueMicrotask(() => module.listen(`info depth 9 score cp 42 pv e2e4 for ${match[1]}`));
          if (command.startsWith('go')) queueMicrotask(() => module.listen('bestmove e2e4'));
        },
        getRecommendedNnue: (index: number): string => (index === 0 ? 'big.nnue' : ''),
        setNnueBuffer: vi.fn<(buffer: Uint8Array, index: number) => void>(),
      };
      return module;
    });
    Reflect.set(globalThis, 'lnExtFakeStockfish', factory);
    window.site = {
      asset: {
        url: (path: string, options?: { documentOrigin: boolean }) => {
          urls.push(`${path}${options ? ' (document)' : ''}`);
          return path.endsWith('.js')
            ? `data:text/javascript,${encodeURIComponent(FAKE_MODULE)}`
            : `/assets/${path}`;
        },
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(async () => new Response(new Uint8Array([1, 2, 3]))),
    );
    // A browser with relaxed SIMD: Lichess's faster build.
    vi.spyOn(WebAssembly, 'validate').mockReturnValue(true);
    const engine = new Stockfish({ chess960: true });
    await engine.boot();
    expect(urls).toEqual([
      'npm/stockfish-web/sf_19_smallnet_relaxed-simd.js (document)',
      'lifat/nnue/big.nnue',
    ]);
    expect(sent).toContain('setoption name UCI_Chess960 value true');
    expect(sent).toContain('setoption name MultiPV value 2');
    const [first, second] = await Promise.all([
      engine.analyse({ position: 'fen one' }),
      engine.analyse({ position: 'fen two', limits: QUICK_SEARCH }),
      engine.analyse({
        position: 'fen three',
        limits: QUICK_SEARCH,
        searchMoves: ['g1f3', 'e1h1'],
      }),
    ]);
    expect(first?.lines).toEqual([{ cp: 42, pv: ['e2e4', 'for', 'one'] }]);
    expect(second?.lines[0]?.pv.at(-1)).toBe('two');
    expect(sent.slice(-6)).toEqual([
      'position fen one',
      'go depth 16 movetime 5000',
      'position fen two',
      'go depth 12 movetime 1000',
      'position fen three',
      'go depth 12 movetime 1000 searchmoves g1f3 e1h1',
    ]);
  });
});

interface Silent {
  readonly engine: Stockfish;
  readonly sent: string[];
  /** Says a line as the engine. */
  readonly say: (line: string) => void;
}

/** An engine whose searches answer only once told to stop, or made to talk. */
async function bootSilent(): Promise<Silent> {
  const sent: string[] = [];
  const module = {
    listen: (_text: string): void => {},
    uci: (command: string): void => {
      sent.push(command);
      if (command === 'stop') queueMicrotask(() => module.listen('bestmove e2e4'));
    },
    getRecommendedNnue: (): string => '',
    setNnueBuffer: (): void => {},
  };
  Reflect.set(globalThis, 'lnExtFakeStockfish', () => module);
  window.site = {
    asset: {
      url: (path: string) =>
        path.endsWith('.js') ? `data:text/javascript,${encodeURIComponent(FAKE_MODULE)}` : path,
    },
  };
  const engine = new Stockfish({ chess960: false });
  await engine.boot();
  return { engine, sent, say: line => module.listen(line) };
}

// How long an engine may say nothing in a search (stockfish.ts).
const SILENCE_MS = 10_000;

describe('Stockfish that stops answering', () => {
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'site');
    Reflect.deleteProperty(globalThis, 'lnExtFakeStockfish');
  });

  it('ends an engine that says nothing for a while, failing the searches queued behind', async () => {
    const { engine, sent } = await bootSilent();
    vi.useFakeTimers();
    const first = engine.analyse({ position: 'fen one', limits: QUICK_SEARCH });
    const second = engine.analyse({ position: 'fen two', limits: QUICK_SEARCH });
    const failures = [first, second].map(search =>
      search.then(
        () => null,
        (error: unknown) => (error instanceof Error ? error.message : null),
      ),
    );
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    // Its answer to the stop would be cut short: it isn't kept.
    expect(await Promise.all(failures)).toEqual([
      'Stockfish stopped answering',
      'Stockfish is not running',
    ]);
    expect(sent.slice(-2)).toEqual(['stop', 'quit']);
    expect(engine.running).toBe(false);
  });

  it('gives a search its time again after the machine slept', async () => {
    const { engine, sent } = await bootSilent();
    vi.useFakeTimers();
    void engine.analyse({ position: 'fen one', limits: QUICK_SEARCH }).catch(() => null);
    await vi.advanceTimersByTimeAsync(0);
    // Asleep: the clock jumps an hour, the timers wake late.
    vi.setSystemTime(Date.now() + 3_600_000);
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    expect(engine.running).toBe(true);
    expect(sent).not.toContain('stop');
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    expect(engine.running).toBe(false);
  });

  // On a busy machine, a 250 ms search took 9 s, its first line after 5 s.
  it('waits for an engine that searches slowly but still talks', async () => {
    const { engine, sent, say } = await bootSilent();
    vi.useFakeTimers();
    const search = engine.analyse({ position: 'fen one', limits: QUICK_SEARCH });
    for (let depth = 1; depth <= 4; depth++) {
      await vi.advanceTimersByTimeAsync(SILENCE_MS - 1000);
      say(`info depth ${depth} multipv 1 score cp 20 pv e2e4`);
    }
    say('bestmove e2e4');
    expect((await search).lines[0]).toEqual({ cp: 20, pv: ['e2e4'] });
    expect(sent).not.toContain('stop');
    expect(engine.running).toBe(true);
  });
});
