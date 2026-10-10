// The road of Puzzle Racer's home scene rushes by while a button is hovered
// (styles/racer/home.css), and gathers or loses speed rather than starting
// and stopping at once. CSS can't ease an animation's speed: its rate is
// eased here, one frame at a time, only while it changes.

const SPEED_UP_MS = 450;
const SLOW_DOWN_MS = 900;
const ROAD = 'lr-ext-racer-road';

/** The road's speed, 0 to 1, `elapsed` ms closer to `target`. */
export function nextSpeed(speed: number, target: number, elapsed: number): number {
  if (target > speed) return Math.min(target, speed + elapsed / SPEED_UP_MS);
  return Math.max(target, speed - elapsed / SLOW_DOWN_MS);
}

// Eased in and out, so the road neither lurches off nor halts.
const smooth = (speed: number): number => speed * speed * (3 - 2 * speed);

function roadOf(scene: HTMLElement): CSSAnimation | undefined {
  return scene
    .getAnimations()
    .find(
      (animation): animation is CSSAnimation =>
        animation instanceof CSSAnimation && animation.animationName === ROAD,
    );
}

/** Speeds the scene's road up while the pointer is over the buttons, and down after. */
export function followRoad(buttons: HTMLElement, scene: HTMLElement): void {
  const road = roadOf(scene);
  if (!road) return;
  let speed = 0;
  let target = 0;
  let frame = 0;
  let last = 0;
  const step = (now: number): void => {
    speed = nextSpeed(speed, target, now - last);
    last = now;
    road.playbackRate = smooth(speed);
    if (speed !== target) {
      frame = requestAnimationFrame(step);
      return;
    }
    frame = 0;
    if (speed === 0) road.pause();
  };
  const head = (to: number): void => {
    target = to;
    if (to > 0 && road.playState !== 'running') {
      road.playbackRate = smooth(speed);
      road.play();
    }
    if (frame === 0) {
      last = performance.now();
      frame = requestAnimationFrame(step);
    }
  };
  buttons.addEventListener('pointerenter', () => head(1));
  buttons.addEventListener('pointerleave', () => head(0));
}
