import { act, renderHook } from '@testing-library/react';

import { useToolbarPosition } from './use-toolbar-position';

describe('useToolbarPosition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('places first appearance immediately and animates only target changes', async () => {
    const { result, rerender } = renderHook(({ id, x }) => useToolbarPosition(id, x, 40), {
      initialProps: { id: 'a', x: 10 },
    });
    expect(result.current).toEqual({ centerX: 10, bottomY: 40 });
    rerender({ id: 'b', x: 210 });
    expect(result.current.centerX).toBe(10);
    await act(() => vi.advanceTimersByTime(80));
    expect(result.current.centerX).toBeGreaterThan(10);
    expect(result.current.centerX).toBeLessThan(210);
    await act(() => vi.advanceTimersByTime(100));
    expect(result.current.centerX).toBe(210);
    rerender({ id: 'b', x: 310 });
    expect(result.current.centerX).toBe(310);
  });

  it('interrupts motion from its current position and cancels frames on unmount', async () => {
    const { result, rerender, unmount } = renderHook(
      ({ id, x }: { id?: string; x: number }) => useToolbarPosition(id, x, 0),
      {
        initialProps: { id: 'a' as string | undefined, x: 0 },
      },
    );
    rerender({ id: 'b', x: 200 });
    await act(() => vi.advanceTimersByTime(64));
    const midway = result.current.centerX;
    rerender({ id: 'c', x: 400 });
    expect(result.current.centerX).toBe(midway);
    await act(() => vi.advanceTimersByTime(180));
    expect(result.current.centerX).toBe(400);
    rerender({ id: 'd', x: 600 });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('respects reduced motion and does not animate reopening', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    const { result, rerender } = renderHook(({ id, x }: { id?: string; x: number }) => useToolbarPosition(id, x, 0), {
      initialProps: { id: 'a' as string | undefined, x: 0 },
    });
    rerender({ id: 'b', x: 200 });
    expect(result.current.centerX).toBe(200);
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
    rerender({ id: undefined, x: 0 });
    rerender({ id: 'c', x: 300 });
    expect(result.current.centerX).toBe(300);
  });
});
