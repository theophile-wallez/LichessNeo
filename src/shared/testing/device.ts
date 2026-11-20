import { onTestFinished, vi } from 'vitest';

/** Gives the device `cores` logical cores and `gigabytes` of memory (none told when null), until the test ends. */
export function stubDevice(cores: number, gigabytes: number | null): void {
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(cores);
  if (gigabytes === null) Reflect.deleteProperty(navigator, 'deviceMemory');
  else Object.defineProperty(navigator, 'deviceMemory', { value: gigabytes, configurable: true });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, 'deviceMemory');
  });
}
