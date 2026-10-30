import { animate, inView } from 'motion';
import { queryAll } from '#shared/dom.ts';

// The coaches' class photo: once it's in sight, they jump onto their rows one
// by one, the back row first, and squash a little as they land. Their own
// bob and hop (sections.css) move `translate`, `scale` and `rotate`, which
// compose with the `transform` this moves.

const rowOf = (coach: HTMLElement): number => Number(coach.dataset.row ?? 2);
const placeOf = (coach: HTMLElement): number =>
  Number.parseFloat(coach.style.getPropertyValue('--x'));

function jump(coach: HTMLElement, delay: number): void {
  animate(
    coach,
    {
      opacity: [0, 1, 1, 1],
      y: ['45%', '-16%', '0%', '0%'],
      scaleX: [0.9, 0.95, 1.14, 1],
      scaleY: [0.9, 1.06, 0.84, 1],
    },
    { duration: 0.8, times: [0, 0.45, 0.7, 1], ease: ['easeOut', 'easeIn', 'easeOut'], delay },
  );
}

export function startCrowd(crowd: HTMLElement): void {
  const coaches = queryAll(crowd, 'img', HTMLElement).toSorted(
    (one, other) => rowOf(one) - rowOf(other) || placeOf(one) - placeOf(other),
  );
  for (const coach of coaches) coach.style.opacity = '0';
  inView(
    crowd,
    () => {
      for (const [i, coach] of coaches.entries()) jump(coach, i * 0.07);
    },
    { amount: 0.3 },
  );
}
