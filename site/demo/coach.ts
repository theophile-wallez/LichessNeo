import type { CoachMood } from '#shared/coach.ts';
import type { MascotView } from '#content/coach/mascot/view.ts';

// The demo's coach: its still at once, then the live 3D mascot the
// extension draws (content/coach/mascot), loaded apart since it carries
// Three.js. Without WebGL, the still stays. Its mood and its mouth follow the
// card, as the review's avatar does.

export class DemoCoach {
  readonly #host: HTMLElement;
  readonly #face: HTMLElement;
  #view: MascotView | null = null;
  #coach: number;
  #mood: CoachMood = 'neutral';
  #talking = false;

  constructor(host: HTMLElement, coach: number) {
    this.#host = host;
    this.#coach = coach;
    // The still and the canvas go in a face, as the review's avatar has them.
    this.#face = document.createElement('span');
    this.#face.className = 'demo-coach__face';
    this.#showStill(coach);
    host.append(this.#face);
  }

  #showStill(coach: number): void {
    const url = new URL(`img/coaches/mascot-${coach}.webp`, document.baseURI).href;
    this.#face.style.setProperty('--still', `url("${url}")`);
  }

  async mount(): Promise<void> {
    const { mountMascot } = await import('#content/coach/mascot/view.ts');
    // It comes in neutral, as its still looks, and takes its mood once drawn.
    this.#view = mountMascot(this.#face, {
      onDrawn: () => {
        this.#host.classList.toggle('demo-coach--live', true);
        this.#view?.setMood(this.#mood);
      },
    });
    this.#view?.setCoach(this.#coach);
    this.#view?.setTalking(this.#talking);
  }

  setCoach(coach: number): void {
    this.#coach = coach;
    this.#showStill(coach);
    this.#view?.setCoach(coach);
  }

  setMood(mood: CoachMood): void {
    this.#mood = mood;
    if (this.#host.classList.contains('demo-coach--live')) this.#view?.setMood(mood);
  }

  setTalking(talking: boolean): void {
    this.#talking = talking;
    this.#view?.setTalking(talking);
  }

  poke(): void {
    this.#view?.poke();
  }
}
