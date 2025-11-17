import { act, renderHook } from '@testing-library/react';

import { useLocalStorage } from './local-storage.hook';

describe('useLocalStorage', () => {
  const key = 'kaoto-test';

  beforeAll(() => {
    localStorage.removeItem(key);
  });

  afterEach(() => {
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
});
