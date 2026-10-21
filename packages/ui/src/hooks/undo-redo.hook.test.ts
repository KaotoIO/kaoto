import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';
import { MockInstance } from 'vitest';

import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';
import { UndoRedoContext, useUndoRedo } from './undo-redo.hook';

describe('useUndoRedo', () => {
  let controller: Visualization;
  let fromModelSpy: MockInstance<Visualization['fromModel']>;

  /** Renders the hook inside a real topology controller */
  const renderUndoRedo = () => {
    const wrapper = ({ children }: PropsWithChildren) => createElement(VisualizationProvider, { controller }, children);
    return renderHook(() => useUndoRedo(), { wrapper });
  };

  beforeEach(() => {
    controller = new Visualization();
    controller.fromModel({ graph: { id: 'graph', type: 'graph' } });
    fromModelSpy = vi.spyOn(controller, 'fromModel');

    /* Start every test from a pristine store and an empty undo/redo history */
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
    const { result } = renderUndoRedo();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update canUndo upon updating the store', () => {
    const { result } = renderUndoRedo();

    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'new code' });
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should update canRedo upon undoing an action', () => {
    const { result } = renderUndoRedo();

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

    const { result } = renderUndoRedo();

    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'new code' });
    });

    act(() => {
      result.current.undo();
    });

    expect(fromModelSpy).toHaveBeenCalledTimes(1);
    expect(fromModelSpy).toHaveBeenCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', { code: '', path: '' });
  });

  it('should notify the code has changed upon redo', () => {
    const eventNotifierSpy = vi.spyOn(EventNotifier.getInstance(), 'next');

    const { result } = renderUndoRedo();

    act(() => {
      useSourceCodeStore.setState({ sourceCode: 'new code' });
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.redo();
    });

    expect(fromModelSpy).toHaveBeenCalledTimes(2);
    expect(fromModelSpy).toHaveBeenLastCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', { code: 'new code', path: '' });
  });
});
