import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';

import { useLocalStorage } from './local-storage.hook';

describe('useLocalStorage', () => {
  const key = 'kaoto-test';

  beforeAll(() => {
    localStorage.removeItem(key);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(key);
  });

  it.each([
    ['localStorage value', 'default value', 'localStorage value'],
    ['42', -1, 42],
    ['true', false, true],
    ['false', true, false],
    [JSON.stringify({ prop: true }), { bar: false }, { prop: true }],
  ])('should get the localStorage value and use it if found', (initialValue, defaultValue, expectedValue) => {
    localStorage.setItem(key, initialValue);

    const [value] = renderHook(() => useLocalStorage(key, defaultValue)).result.current;

    expect(value).toEqual(expectedValue);
  });

  it.each(['value', 42, true, false, { prop: true }])(
    'should get the localStorage value and use it if found',
    (defaultValue) => {
      const [value] = renderHook(() => useLocalStorage(key, defaultValue)).result.current;

      expect(value).toEqual(defaultValue);
    },
  );

  it('should return default value for a non parsable string', () => {
    localStorage.setItem(key, '^(%U!@#%^&');

    const [value] = renderHook(() => useLocalStorage(key, 42)).result.current;

    expect(value).toBe(42);
  });

  it('should store the initial value to localStorage using the key', () => {
    renderHook(() => useLocalStorage(key, 'initial'));

    expect(localStorage.getItem(key)).toBe('initial');
  });

  it('should allow consumers to update the value', () => {
    const result = renderHook(() => useLocalStorage(key, 42)).result;
    const [_, setValue] = result.current;

    act(() => {
      setValue(888);
    });

    expect(result.current[0]).toBe(888);
  });

  it.each(['getItem', 'setItem'] as const)('keeps state usable when storage %s throws', (method) => {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    const { result } = renderHook(() => useLocalStorage(key, 42));

    expect(result.current[0]).toBe(42);
    act(() => {
      result.current[1](888);
    });
    expect(result.current[0]).toBe(888);
  });

  it.each([42, 888])('preserves stored data after a failed read until explicitly setting %s', (nextValue) => {
    localStorage.setItem(key, '123');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Read unavailable', 'SecurityError');
    });

    const { result, rerender } = renderHook(() => useLocalStorage(key, 42), { wrapper: StrictMode });
    getItemSpy.mockRestore();

    expect(result.current[0]).toBe(42);
    expect(localStorage.getItem(key)).toBe('123');
    rerender();
    expect(localStorage.getItem(key)).toBe('123');

    act(() => {
      result.current[1](nextValue);
    });

    expect(result.current[0]).toBe(nextValue);
    expect(localStorage.getItem(key)).toBe(String(nextValue));
  });

  it('supports functional updates after a failed initial read', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Read unavailable', 'SecurityError');
    });
    const { result } = renderHook(() => useLocalStorage(key, 42));
    getItemSpy.mockRestore();

    act(() => {
      result.current[1]((previous) => previous + 1);
      result.current[1]((previous) => previous + 1);
    });

    expect(result.current[0]).toBe(44);
    expect(localStorage.getItem(key)).toBe('44');
  });
});
