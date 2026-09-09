import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useUndoRedo } from './useUndoRedo';

describe('useUndoRedo', () => {
  it.each([
    ['canUndo', false],
    ['canRedo', false],
  ] as const)('returns %s as %s on initial render', (flag, expected) => {
    const { result } = renderHook(() => useUndoRedo());
    expect(result.current[flag]).toBe(expected);
  });

  it.each(['undo', 'redo'] as const)('%s is a callable no-op', (method) => {
    const { result } = renderHook(() => useUndoRedo());
    expect(() => {
      result.current[method]();
    }).not.toThrow();
  });
});
