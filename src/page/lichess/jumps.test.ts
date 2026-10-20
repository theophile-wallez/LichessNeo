import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The hook is set once per page script: each test loads the module afresh.
async function freshOnJump() {
  vi.resetModules();
  const { onJump } = await import('./jumps.ts');
  return onJump;
}

/** An analysis controller whose jumps the test sees. */
function controller() {
  const paths: string[] = [];
  const analysis = {
    jump(path: string): string {
      paths.push(path);
      return `jumped to ${path}`;
    },
  };
  Object.assign(window, { site: { analysis } });
  return { analysis, paths };
}

beforeEach(() => {
  Reflect.deleteProperty(window, 'site');
});

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

describe('onJump', () => {
  it('hooks nothing without an analysis controller', async () => {
    const onJump = await freshOnJump();
    expect(onJump(() => {})).toBe(false);
    Object.assign(window, { site: { analysis: { jump: 'not a function' } } });
    expect(onJump(() => {})).toBe(false);
  });

  it('calls its listeners once each jump is done, after the caller’s own code', async () => {
    const onJump = await freshOnJump();
    const { analysis, paths } = controller();
    const heard: string[][] = [];
    expect(onJump(() => heard.push([...paths]))).toBe(true);
    expect(analysis.jump('/a')).toBe('jumped to /a');
    expect(heard).toEqual([]);
    await Promise.resolve();
    expect(heard).toEqual([['/a']]);
    analysis.jump('/b');
    await Promise.resolve();
    expect(heard).toEqual([['/a'], ['/a', '/b']]);
  });

  it('wraps the jump once for every listener', async () => {
    const onJump = await freshOnJump();
    const { analysis, paths } = controller();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    onJump(first);
    onJump(second);
    analysis.jump('/a');
    await Promise.resolve();
    expect(paths).toEqual(['/a']);
    expect([first.mock.calls.length, second.mock.calls.length]).toEqual([1, 1]);
  });

  it('leaves a controller another copy of the page script hooked', async () => {
    const { analysis } = controller();
    const older = await freshOnJump();
    expect(older(() => {})).toBe(true);
    const newer = await freshOnJump();
    const listener = vi.fn<() => void>();
    expect(newer(listener)).toBe(false);
    analysis.jump('/a');
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
  });
});
