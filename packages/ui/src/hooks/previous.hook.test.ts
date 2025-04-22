import { renderHook } from '@testing-library/react';
import { usePrevious } from './previous.hook';

describe('usePrevious', () => {
  it('should return undefined on initial render', () => {
    const { result } = renderHook(() => usePrevious(0));
    expect(result.current).toBeUndefined();
  });

  it('should return the previous value after an update', () => {
    const { result, rerender } = renderHook((props) => usePrevious(props), {
      initialProps: 0,
    });

    rerender(1);
    expect(result.current).toBe(0);

    rerender(2);
    expect(result.current).toBe(1);
  });

  it('should work with non-primitive values', () => {
    const { result, rerender } = renderHook((props) => usePrevious(props), {
      initialProps: { key: 'value' },
    });

    rerender({ key: 'newValue' });
    expect(result.current).toEqual({ key: 'value' });

    rerender({ key: 'anotherValue' });
    expect(result.current).toEqual({ key: 'newValue' });
  });

  it('should return undefined if no previous value exists', () => {
    const { result } = renderHook(() => usePrevious(undefined));
    expect(result.current).toBeUndefined();
  });
});
