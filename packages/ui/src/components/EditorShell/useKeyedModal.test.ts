import { act, renderHook } from '@testing-library/react';

import { useKeyedModal } from './useKeyedModal';

describe('useKeyedModal', () => {
  it('starts closed, with key 0 and nothing to render', () => {
    const { result } = renderHook(() => useKeyedModal());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.modalKey).toBe(0);
    expect(result.current.shouldRender).toBe(false);
  });

  it('open() opens the modal, bumps the key and enables rendering', () => {
    const { result } = renderHook(() => useKeyedModal());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.modalKey).toBe(1);
    expect(result.current.shouldRender).toBe(true);
  });

  it('close() closes the modal but keeps it rendered and keeps the key', () => {
    const { result } = renderHook(() => useKeyedModal());

    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.modalKey).toBe(1);
    expect(result.current.shouldRender).toBe(true);
  });

  it('every open() produces a new key so the modal remounts with empty fields', () => {
    const { result } = renderHook(() => useKeyedModal());

    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    act(() => {
      result.current.open();
    });

    expect(result.current.modalKey).toBe(2);
    expect(result.current.isOpen).toBe(true);
  });

  it('keeps open and close referentially stable across renders', () => {
    const { result, rerender } = renderHook(() => useKeyedModal());
    const { open, close } = result.current;

    rerender();

    expect(result.current.open).toBe(open);
    expect(result.current.close).toBe(close);
  });
});
