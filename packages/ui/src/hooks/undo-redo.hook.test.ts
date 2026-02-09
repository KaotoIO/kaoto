import { act, renderHook } from '@testing-library/react';

import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';
import { useUndoRedo } from './undo-redo.hook';

const mockController = {
  fromModel: jest.fn(),
};

jest.mock('@patternfly/react-topology', () => ({
  useVisualizationController: () => mockController,
}));

describe('useUndoRedo', () => {
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
    const eventNotifierSpy = jest.spyOn(EventNotifier.getInstance(), 'next');

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
    const eventNotifierSpy = jest.spyOn(EventNotifier.getInstance(), 'next');

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
