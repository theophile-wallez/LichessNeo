import { CloudEvalSchema, fromCloud } from '#page/review/engine/cloud.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { type RecordsRun, takeDeep } from './records.ts';

// Lichess's cloud: positions someone already analyzed deep, which for a game
// means its opening. It asks for one position at a time, one request at a
// time, as Lichess asks. After a few misses in a row, the game has left the
// known lines.

const MISSES = 3;
const TIMEOUT_MS = 5000;

const cloudUrl = (fen: string): string =>
  `/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=2`;

type Answer = 'found' | 'miss' | 'stop';

async function lookUp(run: RecordsRun, index: number): Promise<Answer> {
  const fen = run.work.nodes[index]?.fen ?? '';
  const response = await fetch(cloudUrl(fen), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 404) return 'miss';
  // A refusal (too many requests) ends it.
  if (!response.ok) return 'stop';
  const cloud = CloudEvalSchema.safeParse(await response.json());
  if (!cloud.success) return 'stop';
  const result = fromCloud(fen, cloud.data);
  if (!result) return 'miss';
  if (!run.work.deep[index]) run.work.cloud.add(index);
  takeDeep(run, index, toRecord(fen, result));
  run.onChange?.();
  return 'found';
}

export async function lookUpCloud(run: RecordsRun): Promise<void> {
  const { work } = run;
  let misses = 0;
  for (let i = 0; i < work.nodes.length && misses < MISSES; i++) {
    work.cloudAt = i;
    if (work.deep[i]) continue;
    let answer: Answer;
    try {
      answer = await lookUp(run, i);
    } catch {
      answer = 'stop';
    }
    if (answer === 'stop') break;
    misses = answer === 'miss' ? misses + 1 : 0;
  }
  work.cloudAt = Infinity;
}
