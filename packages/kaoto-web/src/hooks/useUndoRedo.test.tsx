import { renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EditorHistoryContext } from '../context/EditorHistoryContextDefinition';
import { useUndoRedo } from './useUndoRedo';

describe('useUndoRedo', () => {
  it.each([
    ['canUndo', false],
    ['canRedo', false],
  ] as const)('returns %s as %s on initial render', (flag, expected) => {
    const { result } = renderHook(() => useUndoRedo());
    expect(result.current[flag]).toBe(expected);
  });

  it('returns the history of the open editor', () => {
    const history = { undo: vi.fn(), redo: vi.fn(), canUndo: true, canRedo: true };
    const wrapper = ({ children }: PropsWithChildren) => (
      <EditorHistoryContext.Provider value={{ history, setHistory: () => {} }}>
        {children}
      </EditorHistoryContext.Provider>
    );

    const { result } = renderHook(() => useUndoRedo(), { wrapper });

    expect(result.current).toBe(history);
  });

  it.each(['undo', 'redo'] as const)('%s is a callable no-op', (method) => {
    const { result } = renderHook(() => useUndoRedo());
    expect(() => {
      result.current[method]();
    }).not.toThrow();
  });
});
