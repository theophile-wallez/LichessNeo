import { onTestFinished } from 'vitest';

// Chrome blocks site data by throwing from the storage getters themselves.

const AREAS = ['localStorage', 'sessionStorage'] as const;

/** Blocks both storages until the test ends: call it within a test. */
export function blockStorage(): void {
  const originals = AREAS.map(
    name => [name, Object.getOwnPropertyDescriptor(window, name)] as const,
  );
  for (const name of AREAS)
    Object.defineProperty(window, name, {
      configurable: true,
      get: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  onTestFinished(() => {
    for (const [name, descriptor] of originals)
      if (descriptor) Object.defineProperty(window, name, descriptor);
  });
}
