import type { Assigned } from './assign.ts';

// The import dialog's slots (content/packs/import-dialog.ts): the twelve
// pieces, the sounds, or the board, each with the file put in it, and the
// files left aside until the user drags them to theirs.

export interface Slots<Slot extends string, File> {
  readonly get: (slot: Slot) => File | undefined;
  readonly filled: () => readonly Slot[];
  readonly loose: () => readonly File[];
  /** Puts the file in the slot: one left aside leaves the side, the slot's last goes to it. */
  readonly put: (slot: Slot, file: File) => void;
  readonly clear: (slot: Slot) => void;
  /** Files added at once: each in the slot its name says, in place of what it held, else aside. */
  readonly add: (files: readonly File[]) => void;
  readonly onChange: (listener: () => void) => void;
}

export function createSlots<Slot extends string, File>(
  start: Assigned<Slot, File>,
  assign: (files: readonly File[]) => Assigned<Slot, File>,
): Slots<Slot, File> {
  const slots = new Map(start.slots);
  let loose = [...start.loose];
  const listeners = new Set<() => void>();
  const changed = (): void => {
    for (const listener of listeners) listener();
  };
  const put = (slot: Slot, file: File): void => {
    const previous = slots.get(slot);
    loose = loose.filter(entry => entry !== file);
    if (previous !== undefined && previous !== file) loose.push(previous);
    for (const [other, held] of slots) if (held === file) slots.delete(other);
    slots.set(slot, file);
    changed();
  };
  return {
    get: slot => slots.get(slot),
    filled: () => [...slots.keys()],
    loose: () => loose,
    put,
    clear: slot => {
      slots.delete(slot);
      changed();
    },
    add: files => {
      const added = assign(files);
      for (const [slot, file] of added.slots) slots.set(slot, file);
      loose = [...loose, ...added.loose];
      changed();
    },
    onChange: listener => listeners.add(listener),
  };
}
