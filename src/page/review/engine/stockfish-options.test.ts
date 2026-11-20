import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_REVIEW_ENGINE } from '#shared/review-engine/options.ts';
import { bootEngine } from '#page/review/engine-pool.ts';
import { pickReviewEngine } from './review-engine.ts';
import { Stockfish } from './stockfish.ts';

// A stand-in for stockfish-web, which answers nothing but takes the commands.
const FAKE_MODULE = `export default async options => globalThis.lnExtFakeStockfish(options);`;

interface Booted {
  readonly sent: string[];
  readonly urls: string[];
  /** The pages of shared memory each engine was given. */
  readonly pages: number[];
}

function fakeBuild(): Booted {
  const booted: Booted = { sent: [], urls: [], pages: [] };
  Reflect.set(globalThis, 'lnExtFakeStockfish', () => ({
    listen: (_text: string): void => {},
    uci: (command: string): void => {
      booted.sent.push(command);
    },
    getRecommendedNnue: (): string => '',
    setNnueBuffer: (): void => {},
  }));
  window.site = {
    asset: {
      url: (path: string) => {
        booted.urls.push(path);
        return path.endsWith('.js')
          ? `data:text/javascript,${encodeURIComponent(FAKE_MODULE)}`
          : path;
      },
    },
  };
  const RealMemory = WebAssembly.Memory;
  vi.spyOn(WebAssembly, 'Memory').mockImplementation(function smallMemory(descriptor) {
    booted.pages.push(descriptor.initial);
    return new RealMemory({ initial: 1 });
  });
  vi.spyOn(WebAssembly, 'validate').mockReturnValue(false);
  return booted;
}

const options = (sent: readonly string[]): string[] =>
  sent.filter(
    command =>
      command.startsWith('setoption name Threads') || command.startsWith('setoption name Hash'),
  );

afterEach(() => {
  vi.useRealTimers();
  pickReviewEngine(DEFAULT_REVIEW_ENGINE);
  Reflect.deleteProperty(window, 'site');
  Reflect.deleteProperty(globalThis, 'lnExtFakeStockfish');
});

describe('the review’s engines', () => {
  it('boot the light network on one thread and a 16 MB table unless told', async () => {
    const { sent, urls, pages } = fakeBuild();
    await new Stockfish({ chess960: false }).boot();
    expect(urls[0]).toBe('npm/stockfish-web/sf_19_smallnet.js');
    expect(pages).toEqual([1536]);
    expect(options(sent)).toEqual([
      'setoption name Threads value 1',
      'setoption name Hash value 16',
    ]);
  });

  it('boot the network, threads and table the settings pick', async () => {
    const { sent, urls, pages } = fakeBuild();
    pickReviewEngine({ ...DEFAULT_REVIEW_ENGINE, engine: 'full', threads: 2, hash: 64 });
    await bootEngine(false);
    expect(urls[0]).toBe('npm/stockfish-web/sf_19.js');
    // Lichess's own size for the full network's build.
    expect(pages).toEqual([2560]);
    expect(options(sent)).toEqual([
      'setoption name Threads value 2',
      'setoption name Hash value 64',
    ]);
  });
});

describe('a deep search', () => {
  it('may stay silent for half its time before its engine is given up', async () => {
    fakeBuild();
    const engine = new Stockfish({ chess960: false });
    await engine.boot();
    vi.useFakeTimers();
    const search = engine.analyse({ position: 'fen one', limits: { depth: 30, movetime: 30_000 } });
    void search.catch(() => null);
    await vi.advanceTimersByTimeAsync(14_000);
    expect(engine.running).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(engine.running).toBe(false);
    await expect(search).rejects.toThrow('Stockfish stopped answering');
  });
});
