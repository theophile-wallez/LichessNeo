// A frame loop that runs only while its element is on screen and the tab is
// visible, so a mascot out of sight costs nothing.

// A long pause (a hidden tab, a debugger) resumes as one short step.
const MAX_STEP = 1 / 30;

export class VisibleLoop {
  readonly #onFrame: (dt: number) => void;
  readonly #observer: IntersectionObserver;
  #onScreen = false;
  #frame = 0;
  #last = 0;

  constructor(element: Element, onFrame: (dt: number) => void) {
    this.#onFrame = onFrame;
    this.#observer = new IntersectionObserver(entries => {
      this.#onScreen = entries.some(entry => entry.isIntersecting);
      this.#update();
    });
    this.#observer.observe(element);
    document.addEventListener('visibilitychange', this.#update);
  }

  get running(): boolean {
    return this.#frame !== 0;
  }

  readonly #update = (): void => {
    const wanted = this.#onScreen && document.visibilityState === 'visible';
    if (wanted && !this.running) {
      this.#last = performance.now();
      this.#frame = requestAnimationFrame(this.#tick);
    } else if (!wanted && this.running) {
      cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
  };

  readonly #tick = (now: number): void => {
    const dt = Math.min(Math.max(now - this.#last, 0) / 1000, MAX_STEP);
    this.#last = now;
    this.#onFrame(dt);
    this.#frame = requestAnimationFrame(this.#tick);
  };

  dispose(): void {
    this.#observer.disconnect();
    document.removeEventListener('visibilitychange', this.#update);
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }
}
