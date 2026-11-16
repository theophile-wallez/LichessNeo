import { animate, stagger } from 'motion';
import { queryAll, queryOne } from '#shared/dom.ts';
import { playHeroCascade } from './hero-3d.ts';

// The page's one entrance: the headline word by word, out of a blur, then the
// words under it, then the live review's window assembling in 3D layer by layer
// onto its chassis (hero-3d.ts), which stands up as it scrolls into view. The
// first paint hides them all (index.html's data-motion, hero.css), so nothing
// shows before its turn.

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** The headline's words, each in a span of its own, the spaces between them kept. Words
    joined by a no-break space stay one: a line may break between two spans whatever lies
    between them. */
function splitWords(headline: HTMLElement): HTMLElement[] {
  const pieces = headline.textContent.split(/( )/);
  const words = pieces.map((piece, i) => {
    if (i % 2 === 1) return document.createTextNode(piece);
    const word = document.createElement('span');
    word.className = 'hero-word';
    word.textContent = piece;
    word.style.opacity = '0';
    return word;
  });
  headline.replaceChildren(...words);
  headline.style.opacity = '1';
  return queryAll(headline, '.hero-word', HTMLElement);
}

/** Plays the entrance, done once the live review's window and its layers have landed. */
export async function playEntrance(): Promise<void> {
  const hero = queryOne(document, '.hero', HTMLElement);
  if (!hero) return;
  const headline = queryOne(hero, 'h1', HTMLElement);
  const words = headline ? splitWords(headline) : [];
  animate(
    words,
    { opacity: [0, 1], y: ['0.4em', '0em'], filter: ['blur(14px)', 'blur(0px)'] },
    { duration: 1, ease: EASE_OUT, delay: stagger(0.1, { startDelay: 0.1 }) },
  );
  animate(
    queryAll(hero, '.hero-words > :not(h1)', HTMLElement),
    { opacity: [0, 1], y: [20, 0] },
    { duration: 0.9, ease: EASE_OUT, delay: stagger(0.08, { startDelay: 0.4 }) },
  );
  const stage = queryOne(hero, '.demo-stage', HTMLElement);
  const demo = queryOne(hero, '.demo', HTMLElement);
  if (stage && demo) await playHeroCascade(stage, demo, 0.5);
}
