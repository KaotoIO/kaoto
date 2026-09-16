import { act, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';

import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';
import { UndoRedoContext, useUndoRedo } from './undo-redo.hook';

const mockController = vi.hoisted(() => ({
  fromModel: vi.fn(),
}));

vi.mock('@patternfly/react-topology', () => ({
  useVisualizationController: () => mockController,
}));

describe('useUndoRedo', () => {
  beforeEach(() => {
    useSourceCodeStore.setState({ sourceCode: '', path: '' });
    useSourceCodeStore.temporal.getState().clear();
  });

  it('delegates host history actions without changing source or local history', () => {
    const host = { undo: vi.fn(), redo: vi.fn(), canUndo: true, canRedo: true };
    const { result } = renderHook(() => useUndoRedo(), {
      wrapper: ({ children }: PropsWithChildren) => createElement(UndoRedoContext.Provider, { value: host }, children),
    });
    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'edited' });
    });
    const history = useSourceCodeStore.temporal.getState();
    act(() => {
      result.current.undo();
      result.current.redo();
    });
    expect(host.undo).toHaveBeenCalledOnce();
    expect(host.redo).toHaveBeenCalledOnce();
    expect(useSourceCodeStore.getState().sourceCode).toBe('edited');
    expect(useSourceCodeStore.temporal.getState()).toBe(history);
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useUndoRedo());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update canUndo upon updating the store', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'new code' });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update canRedo upon undoing an action', () => {
    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'new code' });
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should notify the code has changed upon undo', () => {
    const eventNotifierSpy = vi.spyOn(EventNotifier.getInstance(), 'next');

    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'new code' });
    });

    act(() => {
      result.current.undo();
    });

    expect(mockController.fromModel).toHaveBeenCalledTimes(1);
    expect(mockController.fromModel).toHaveBeenCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', { code: '', path: '' });
  });

  it('should notify the code has changed upon redo', () => {
    const eventNotifierSpy = vi.spyOn(EventNotifier.getInstance(), 'next');

    const { result } = renderHook(() => useUndoRedo());

    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'new code' });
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.redo();
    });

    expect(mockController.fromModel).toHaveBeenCalledTimes(2);
    expect(mockController.fromModel).toHaveBeenLastCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', { code: 'new code', path: '' });
  });
});
