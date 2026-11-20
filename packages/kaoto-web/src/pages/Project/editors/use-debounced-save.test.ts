import { act, renderHook } from '@testing-library/react';

import { useDebouncedSave } from './use-debounced-save';

describe('useDebouncedSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves the last content once after the delay', () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 300));

    act(() => {
      result.current.schedule('a', 'first');
      result.current.schedule('a', 'second');
    });
    expect(save).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(save).toHaveBeenCalledExactlyOnceWith('a', 'second');
  });

  it('saves the pending content on unmount', () => {
    const save = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedSave(save, 300));
    act(() => {
      result.current.schedule('a', 'pending');
    });

    unmount();

    expect(save).toHaveBeenCalledExactlyOnceWith('a', 'pending');
  });

  it('saves the pending content of the previous file before content of another file', () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 300));
    act(() => {
      result.current.schedule('a', 'content of a');
    });

    act(() => {
      result.current.schedule('b', 'content of b');
    });

    expect(save).toHaveBeenCalledExactlyOnceWith('a', 'content of a');
  });

  it('does not save anything when nothing is pending', () => {
    const save = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedSave(save, 300));

    act(() => {
      result.current.flush();
    });
    unmount();

    expect(save).not.toHaveBeenCalled();
  });
});
