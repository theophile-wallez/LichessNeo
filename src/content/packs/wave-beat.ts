// A sound player's bar that beats while its sound plays (sound-player.ts):
// each beat swells and shrinks back to the bar's rest, so it starts from there,
// and once its sound ends it finishes the beat under way rather than snapping
// back. A CSS animation can do neither: it starts on its first keyframe and
// stops dead when its class goes.

const BEAT: Keyframe[] = [
  { transform: 'scaleY(1)' },
  { transform: 'scaleY(1.35)', offset: 0.3 },
  { transform: 'scaleY(0.65)', offset: 0.75 },
  { transform: 'scaleY(1)' },
];
const BEAT_MS = 620;
/** The bars start one after the other, a ripple rather than one block. */
const STAGGER_MS = 70;

const beats = new WeakMap<HTMLElement, Animation>();

/** Starts the bar beating, or lets it finish its beat and rest. */
export function setBeating(bar: HTMLElement, on: boolean, index: number): void {
  const beat = beats.get(bar);
  if (on && !beat) {
    const started = bar.animate(BEAT, {
      duration: BEAT_MS,
      delay: (index % 4) * STAGGER_MS,
      iterations: Infinity,
      easing: 'ease-in-out',
    });
    beats.set(bar, started);
  } else if (!on && beat) {
    beats.delete(bar);
    // Ends with the beat under way, or at once if it hasn't begun: cancel()
    // would jump back too, and reject the animation's `finished`.
    const { currentIteration } = beat.effect?.getComputedTiming() ?? {};
    beat.effect?.updateTiming({ iterations: (currentIteration ?? -1) + 1 });
  }
}
