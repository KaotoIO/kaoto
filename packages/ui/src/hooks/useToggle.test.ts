import { act, renderHook } from '@testing-library/react';

import { useToggle } from './useToggle';

describe('useToggle', () => {
  it('keeps local toggles until the initial state changes', async () => {
    const { result, rerender } = renderHook((initialState: boolean) => useToggle(initialState), {
      initialProps: false,
    });
    await act(async () => result.current.toggle());
    expect(result.current.state).toBe(true);
    rerender(false);
    expect(result.current.state).toBe(true);
    rerender(true);
    act(() => {
      result.current.toggleOff();
    });
    expect(result.current.state).toBe(false);
    rerender(false);
    rerender(true);
    expect(result.current.state).toBe(true);
  });

  it('uses the async toggle callback result', async () => {
    const onToggle = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useToggle(false, onToggle));
    await act(async () => result.current.toggle());
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(result.current.state).toBe(false);
  });
});
