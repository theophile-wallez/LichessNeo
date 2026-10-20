import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';
import { readSite } from './globals.ts';
import { method } from './method.ts';

// Every move of the analysis board goes through the controller's `jump(path)`:
// a step with the arrow keys, a click in the move list, our own jumps. Wrapped,
// it tells us at once rather than at our next look.

const JumperSchema = z.object({
  jump: method<unknown[]>(),
  // Set once our hook is in, so another copy of the page script leaves it be.
  lnExtJumpHooked: z.optional(z.boolean()),
});

const hasJumper = createGuard(z.object({ analysis: JumperSchema }));

const listeners = new Set<() => void>();
let hooked = false;

/**
 * Calls `listener` after each jump of the analysis board, once the jump is
 * done; false when there's no controller to hook, or another copy hooked it.
 */
export function onJump(listener: () => void): boolean {
  const site = readSite();
  if (!hasJumper(site)) return false;
  const controller = site.analysis;
  if (controller.lnExtJumpHooked && !hooked) return false;
  listeners.add(listener);
  if (hooked) return true;
  hooked = true;
  controller.lnExtJumpHooked = true;
  const jump = controller.jump;
  controller.jump = (...args: unknown[]): unknown => {
    const result = jump.apply(controller, args);
    // After what the caller does with the jump, in the same task: before the frame is drawn.
    queueMicrotask(() => {
      for (const each of listeners) each();
    });
    return result;
  };
  return true;
}
