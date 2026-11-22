import { describe, expect, it } from 'vitest';
import { networkNames, setUp, type StockfishModule } from './module.ts';

/** A build that answers `networks` and keeps the commands it's sent. */
function fakeModule(networks: readonly string[]): StockfishModule & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    uci: (command: string) => sent.push(command),
    getRecommendedNnue: (index: number) => networks[index] ?? '',
    setNnueBuffer: () => undefined,
  };
}

describe('a stockfish-web build', () => {
  it('names the networks it asks for, in its order, up to the first empty name', () => {
    expect(networkNames(fakeModule(['nn-big.nnue', 'nn-small.nnue']))).toEqual([
      'nn-big.nnue',
      'nn-small.nnue',
    ]);
    expect(networkNames(fakeModule([]))).toEqual([]);
  });

  it('is set up for two lines, with its threads and table as given', () => {
    const module = fakeModule([]);
    setUp(module, { threads: 1, hash: 16, chess960: false });
    expect(module.sent).toEqual([
      'uci',
      'setoption name Threads value 1',
      'setoption name Hash value 16',
      'setoption name MultiPV value 2',
    ]);
  });

  it('plays Chess960 when asked', () => {
    const module = fakeModule([]);
    setUp(module, { threads: 2, hash: 32, chess960: true });
    expect(module.sent.at(-1)).toBe('setoption name UCI_Chess960 value true');
  });
});
