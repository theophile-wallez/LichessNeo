import { describe, expect, it } from 'vitest';
import { z } from 'zod/mini';
import { barLabel, formatEval } from './format.ts';
import { winPercent } from '#shared/chess/index.ts';
import { forColor, moveAccuracy } from './score.ts';
import { StoredRecordCodec } from './stored.ts';
// What the original script printed and computed.
import legacy from './fixtures/legacy.json' with { type: 'json' };

describe('formatEval and barLabel', () => {
  it('print scores as the original did', () => {
    for (const [score, text, label] of legacy.formats) {
      const value = score === null || typeof score !== 'object' ? null : score;
      expect(formatEval(value)).toBe(text);
      expect(barLabel(value)).toBe(label);
    }
  });
});

describe('win probability and accuracy', () => {
  it('follow Lichess’s curves', () => {
    for (const [cp, win] of legacy.numbers) expect(winPercent(cp ?? 0)).toBe(win);
    for (const [loss, accuracy] of legacy.accuracies)
      expect(moveAccuracy(loss ?? 0)).toBe(accuracy);
    expect(forColor(70, 'white')).toBe(70);
    expect(forColor(70, 'black')).toBe(30);
  });
});

describe('StoredRecordCodec', () => {
  it('reads the cache’s records, and nothing else', () => {
    expect(StoredRecordCodec.parse({ cp: 20, wp: 51.8, wp2: null, best: 'e2e4' })).toEqual({
      cp: 20,
      whiteWinChance: 51.8,
      secondLineWinChance: null,
      best: 'e2e4',
    });
    expect(StoredRecordCodec.parse({ mate: -2, wp: 0, wp2: 12.5, best: null })).toEqual({
      mate: -2,
      whiteWinChance: 0,
      secondLineWinChance: 12.5,
      best: null,
    });
    expect(StoredRecordCodec.safeParse({ wp: 50, wp2: null, best: null }).success).toBe(false);
    expect(StoredRecordCodec.safeParse({ cp: '20', wp: 50, wp2: null, best: null }).success).toBe(
      false,
    );
  });

  it('writes records back in the stored format and order', () => {
    const stored =
      '[{"cp":0,"wp":50,"wp2":48,"best":"e2e4"},{"mate":3,"wp":100,"wp2":null,"best":null}]';
    const records = z.array(StoredRecordCodec).parse(JSON.parse(stored));
    expect(JSON.stringify(z.encode(z.array(StoredRecordCodec), records))).toBe(stored);
  });
});
