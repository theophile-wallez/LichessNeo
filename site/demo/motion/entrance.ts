import { animate, scroll, stagger } from 'motion';
import { queryAll, queryOne } from '#shared/dom.ts';

// The page's one entrance: the headline word by word, out of a blur, then the
// words under it, then the live review's window rising. The window then stands
// up as it scrolls into view, shrinking to its size. The first paint hides them all (index.html's
// data-motion, hero.css), so nothing shows before its turn.

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

/** How much larger the window lies back than it stands: as wide as the screen leaves it,
    so it shrinks to its fitted size as it stands up. */
function lyingScale(demo: HTMLElement): number {
  const room = document.documentElement.clientWidth - 32;
  return Math.min(1.25, Math.max(1, room / demo.offsetWidth));
}

function standUp(demo: HTMLElement): void {
  const scale = lyingScale(demo);
  scroll(
    animate(demo, { rotateX: [30, 0], scale: [scale, 1], y: ['-3%', '0%'] }, { ease: 'linear' }),
    {
      target: demo,
      offset: ['start end', 'start 0.2'],
    },
  );
}

/** Plays the entrance, done once the live review's window has risen. */
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
  const demo = queryOne(hero, '.demo', HTMLElement);
  if (demo) standUp(demo);
  const stage = queryOne(hero, '.demo-stage', HTMLElement);
  if (stage)
    await animate(
      stage,
      { opacity: [0, 1], y: [90, 0] },
      { type: 'spring', visualDuration: 1, bounce: 0.15, delay: 0.6 },
    );
}
