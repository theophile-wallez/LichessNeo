import type { Color } from '#shared/chess/types.ts';
import { winPercent } from '#shared/chess/win.ts';
import { queryOne, setData, setDataText, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Copies the engine's score, on the analysis board and on puzzles, onto Lichess's
// eval bar, so styles/board/coordinates.css can draw it like the Game Review's, and
// onto the engine's header, whose chip and win bar (styles/analysis/engine.css)
// take the leading side's color.

export interface GaugeScore {
  /** The short form ("1.2", "M3"), or '' when there's no score. */
  readonly label: string;
  readonly lead: Color;
}

interface PearlScore {
  readonly mate: boolean;
  /** The number as written, unsigned. */
  readonly digits: string;
  readonly lead: Color;
}

// Lichess writes a negative score with a minus sign (U+2212), or a hyphen.
const MINUS = '\u2212';

function readPearl(pearl: string): PearlScore | null {
  const match = /^(#)?([+\-\u2212])?(\d+(?:\.\d+)?)$/.exec(pearl.trim());
  if (!match) return null;
  const [, mate, sign, digits = ''] = match;
  return {
    mate: mate !== undefined,
    digits,
    lead: sign === '-' || sign === MINUS ? 'black' : 'white',
  };
}

/** The score of the engine line's pearl ("+1.2", "#-3"). */
export function gaugeScore(pearl: string): GaugeScore {
  const score = readPearl(pearl);
  if (!score) return { label: '', lead: 'white' };
  return { label: score.mate ? `M${score.digits}` : score.digits, lead: score.lead };
}

/** White's win chances, 0 to 100, from the pearl; a mate is all or nothing. */
function whiteShare(pearl: string): number | null {
  const score = readPearl(pearl);
  if (!score) return null;
  if (score.mate) return score.lead === 'white' ? 100 : 0;
  const pawns = Number(score.digits);
  return winPercent(100 * (score.lead === 'white' ? pawns : -pawns));
}

function markHeader(ceval: HTMLElement, pearl: string): void {
  const share = whiteShare(pearl);
  setData(ceval, 'lnExtLead', share === null ? null : gaugeScore(pearl).lead);
  setStyleProperty(ceval, '--ln-ext-white-share', share === null ? null : `${share.toFixed(1)}%`);
}

/** A sync task copying the engine line's score onto the eval bar and the engine's header. */
export function syncEvalGauge(): void {
  const main = queryOne(document, 'main.puzzle, main.analyse', HTMLElement);
  if (!main) return;
  const ceval = queryOne(main, '.ceval', HTMLElement);
  const pearl = ceval?.querySelector('pearl')?.textContent ?? '';
  const gauge = queryOne(main, '.eval-gauge', HTMLElement);
  if (gauge) {
    const { label, lead } = gaugeScore(pearl);
    setDataText(gauge, 'lnExtEval', label);
    setData(gauge, 'lnExtLead', lead);
  }
  if (ceval) markHeader(ceval, pearl);
}

export const evalGauge: Feature = {
  name: 'eval gauge',
  start: () => onEveryTick('eval gauge', syncEvalGauge),
};
