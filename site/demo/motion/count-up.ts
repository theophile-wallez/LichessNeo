import { flowTo } from './flow.ts';

// Figures that roll up from zero as they show: an accuracy, a count of moves.
// A figure counted again, before or after its roll ends, rolls to the same value.

const FIGURE = /^\d+(?:\.(\d+))?$/;

// Each figure's text, which its flow takes the place of.
const texts = new WeakMap<HTMLElement, string>();

export function countUp(figures: Iterable<HTMLElement>): void {
  for (const figure of figures) {
    const text = texts.get(figure) ?? figure.textContent.trim();
    const match = FIGURE.exec(text);
    const value = Number(text);
    if (!match || value === 0) continue;
    texts.set(figure, text);
    const decimals = match[1]?.length ?? 0;
    const options = {
      format: { minimumFractionDigits: decimals, maximumFractionDigits: decimals },
      continuous: true,
    };
    figure.replaceChildren();
    flowTo(figure, 0, options);
    // Drawn at zero first: a flow rolls only from a value it has shown.
    requestAnimationFrame(() => flowTo(figure, value, options));
  }
}
