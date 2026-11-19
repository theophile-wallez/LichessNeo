import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as BookModule from './book.ts';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const STUDY = `[Event "First moves"]\n\n1. e4 { The centre, [Nf6] or e5. [%cal Ge2e4] } 1... e5 ( 1... c5 ) *`;

type Book = typeof BookModule;

// Each test reads the theory anew: the module keeps it for the page.
async function freshBook(): Promise<Book> {
  vi.resetModules();
  return import('./book.ts');
}

const fetched = vi.fn<(url: string) => Promise<Response>>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  fetched.mockReset();
  vi.stubGlobal('fetch', fetched);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the studies', () => {
  it('have one per language', async () => {
    const { STUDIES } = await freshBook();
    expect(STUDIES).toEqual({ en: 'gADVcG4j', fr: 'nKXcgQ3x' });
  });
});

describe('loadTheory', () => {
  it('reads a study’s export once, then says its theory is in', async () => {
    const { loadTheory, theoryAt } = await freshBook();
    fetched.mockResolvedValue(new Response(STUDY));
    const loaded = vi.fn<() => void>();
    loadTheory('abcdefgh', loaded);
    loadTheory('abcdefgh', loaded);
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    expect(fetched).toHaveBeenCalledOnce();
    expect(fetched.mock.calls[0]?.[0]).toBe(
      '/api/study/abcdefgh.pgn?comments=true&variations=true&clocks=false&orientation=false',
    );
    const entry = theoryAt(AFTER_E4);
    expect(entry?.text).toBe('The centre, [[m:b:Nf6@a:g8f6]] or [[s:e5]].');
    expect(entry?.next.map(move => move.san)).toEqual(['e5', 'c5']);
    expect(entry?.mistake).toBe(false);
    expect(entry?.drawing).toEqual({
      topic: 'plans',
      marks: [{ kind: 'link', from: 'e2', to: 'e4', tone: 'defense' }],
    });
    // The same entry each time: the comment is written once.
    expect(theoryAt(AFTER_E4)).toBe(entry);
  });

  it('knows no theory before the study is in, nor where it has none', async () => {
    const { loadTheory, theoryAt } = await freshBook();
    expect(theoryAt(AFTER_E4)).toBeNull();
    fetched.mockResolvedValue(new Response(STUDY));
    const loaded = vi.fn<() => void>();
    loadTheory('abcdefgh', loaded);
    await vi.waitFor(() => expect(loaded).toHaveBeenCalled());
    expect(theoryAt('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1')).toBeNull();
  });

  it('asks again a while after a failed read, not at once', async () => {
    const { loadTheory, RETRY_MS, theoryAt } = await freshBook();
    fetched.mockResolvedValueOnce(new Response('', { status: 502 }));
    const loaded = vi.fn<() => void>();
    loadTheory('abcdefgh', loaded);
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledOnce());
    loadTheory('abcdefgh', loaded);
    expect(fetched).toHaveBeenCalledOnce();
    vi.setSystemTime(Date.now() + RETRY_MS);
    fetched.mockResolvedValueOnce(new Response(STUDY));
    loadTheory('abcdefgh', loaded);
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    expect(theoryAt(AFTER_E4)).not.toBeNull();
  });

  it('says nothing changed of a study with no theory', async () => {
    const { loadTheory } = await freshBook();
    fetched.mockResolvedValue(new Response(''));
    const loaded = vi.fn<() => void>();
    loadTheory('abcdefgh', loaded);
    await vi.waitFor(() => expect(fetched).toHaveBeenCalledOnce());
    // The read's promises, settled before the next task.
    await new Promise(resolve => setTimeout(resolve));
    expect(loaded).not.toHaveBeenCalled();
  });

  it('drops a language’s theory for another’s, even while that one is on its way', async () => {
    const { loadTheory, takeTheory, theoryAt } = await freshBook();
    takeTheory('english1', STUDY);
    expect(theoryAt(AFTER_E4)).not.toBeNull();
    fetched.mockResolvedValue(new Response('', { status: 502 }));
    loadTheory('french12', () => undefined);
    expect(theoryAt(AFTER_E4)).toBeNull();
  });
});

describe('takeTheory', () => {
  it('takes a study’s export at once, as the site’s snapshot', async () => {
    const { takeTheory, theoryAt } = await freshBook();
    takeTheory('abcdefgh', STUDY);
    expect(theoryAt(AFTER_E4)?.next.map(move => move.uci)).toEqual(['e7e5', 'c7c5']);
    expect(fetched).not.toHaveBeenCalled();
  });
});
