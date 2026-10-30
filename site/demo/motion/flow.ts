import NumberFlow, { type Format } from 'number-flow';
import { continuous } from 'number-flow/plugins';

// Figures that roll to their new value digit by digit (NumberFlow): the
// converter's ratings, the bars' ratings, an accuracy, a count of moves.

interface FlowOptions {
  format?: Format;
  /** Text before the number, kept still as it rolls. */
  prefix?: string;
  /** Each digit rolls through the ones between, as a count does. */
  continuous?: boolean;
}

/** The figure `holder` shows, rolled to `value`: its flow is made the first time. */
export function flowTo(holder: HTMLElement, value: number, options: FlowOptions = {}): void {
  const shown = holder.firstElementChild;
  if (shown instanceof NumberFlow) {
    shown.update(value);
    return;
  }
  const flow = new NumberFlow();
  flow.locales = 'en';
  if (options.format) flow.format = options.format;
  if (options.prefix) flow.numberPrefix = options.prefix;
  // The site ignores the reduced-motion setting, as the extension does.
  flow.respectMotionPreference = false;
  if (options.continuous) flow.plugins = [continuous];
  flow.update(value);
  holder.replaceChildren(flow);
}
