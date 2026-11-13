import { act, render, renderHook } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';

import { UndoRedoContext } from '../hooks/undo-redo.hook';
import { useReloadContext } from '../hooks/useReloadContext/useReloadContext';
import { LocalStorageKeys } from '../models';
import { useSourceCodeStore } from '../store';
import { camelRouteYaml } from '../stubs/camel-route';
import { EventNotifier } from '../utils';
import { ReloadProvider } from './reload.provider';
import {
  inMemorySourceCodeAdapter,
  localStorageSourceCodeAdapter,
  SourceCodeAdapter,
  SourceCodeProvider,
  SourceDocument,
} from './source-code.provider';

describe('SourceCodeProvider', () => {
  const history = { undo: vi.fn(), redo: vi.fn(), canUndo: true, canRedo: true };

  /** An adapter whose document is delivered on demand by the test */
  const deferredAdapter = (onChange?: SourceCodeAdapter['onChange']) => {
    let deliver!: (document: SourceDocument) => void;
    const adapter: SourceCodeAdapter = {
      subscribe(apply) {
        deliver = apply;
        return () => {};
      },
      onChange,
    };
    return {
      adapter,
      deliver: (document: SourceDocument) => {
        deliver(document);
      },
    };
  };

  beforeEach(() => {
    useSourceCodeStore.setState({ sourceCode: '', path: undefined });
    useSourceCodeStore.temporal.getState().resume();
    useSourceCodeStore.temporal.getState().clear();
  });

  it('seeds the store from the adapter and emits code:updated with the path', () => {
    const nextSpy = vi.spyOn(EventNotifier.getInstance(), 'next');

    render(
      <SourceCodeProvider adapter={inMemorySourceCodeAdapter(camelRouteYaml, 'route.camel.yaml')}>
        <div />
      </SourceCodeProvider>,
    );

    expect(useSourceCodeStore.getState()).toMatchObject({ sourceCode: camelRouteYaml, path: 'route.camel.yaml' });
    expect(nextSpy).toHaveBeenCalledWith('code:updated', { code: camelRouteYaml, path: 'route.camel.yaml' });

    nextSpy.mockRestore();
  });

  it('clears the undo/redo history after the first document only', () => {
    const { adapter, deliver } = deferredAdapter();
    render(<SourceCodeProvider adapter={adapter} />);

    act(() => {
      deliver({ code: 'first' });
    });
    expect(useSourceCodeStore.temporal.getState().pastStates).toHaveLength(0);

    act(() => {
      deliver({ code: 'second' });
    });
    expect(useSourceCodeStore.temporal.getState().pastStates).toHaveLength(1);
  });

  it('forwards editor changes to the adapter and keeps the store in sync', () => {
    const onChange = vi.fn();
    render(<SourceCodeProvider adapter={{ ...inMemorySourceCodeAdapter('initial'), onChange }} />);
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      EventNotifier.getInstance().next('entities:updated', camelRouteYaml);
    });
    expect(useSourceCodeStore.getState().sourceCode).toEqual(camelRouteYaml);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(camelRouteYaml);

    act(() => {
      EventNotifier.getInstance().next('entities:updated', camelRouteYaml);
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    act(() => {
      useSourceCodeStore.getState().setCodeAndNotify('typed in the code tab');
    });
    expect(onChange).toHaveBeenLastCalledWith('typed in the code tab');
  });

  it('does not echo documents delivered by the adapter', () => {
    const onChange = vi.fn();
    const { adapter, deliver } = deferredAdapter(onChange);
    render(<SourceCodeProvider adapter={adapter} />);

    act(() => {
      deliver({ code: 'from host', path: 'route.camel.yaml' });
    });

    expect(useSourceCodeStore.getState()).toMatchObject({ sourceCode: 'from host', path: 'route.camel.yaml' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pauses the local history while the host owns it and resumes on unmount', () => {
    const { unmount } = render(<SourceCodeProvider adapter={inMemorySourceCodeAdapter('initial')} history={history} />);

    act(() => {
      useSourceCodeStore.getState().setSourceCode('canvas change');
      useSourceCodeStore.getState().setCodeAndNotify('native undo result');
    });

    expect(useSourceCodeStore.temporal.getState().pastStates).toEqual([]);
    expect(useSourceCodeStore.temporal.getState().isTracking).toBe(false);
    unmount();
    expect(useSourceCodeStore.temporal.getState().isTracking).toBe(true);
  });

  it('exposes the host history to the undo/redo context', () => {
    const { result } = renderHook(() => useContext(UndoRedoContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter()} history={history}>
          {children}
        </SourceCodeProvider>
      ),
    });

    expect(result.current).toBe(history);
  });

  it('asks the adapter for the document again when the reload boundary remounts it', async () => {
    const onChange = vi.fn();
    const subscribe = vi.fn((apply: (document: SourceDocument) => void) => {
      apply({ code: camelRouteYaml, path: 'route.camel.yaml' });
      return () => {};
    });
    const ReloadButton = () => {
      const { reloadPage } = useReloadContext();
      return (
        <button type="button" onClick={reloadPage}>
          Reload
        </button>
      );
    };
    const { getByText } = render(
      <ReloadProvider>
        <SourceCodeProvider adapter={{ subscribe, onChange }}>
          <ReloadButton />
        </SourceCodeProvider>
      </ReloadProvider>,
    );

    await act(async () => {
      getByText('Reload').click();
    });

    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(useSourceCodeStore.getState().sourceCode).toEqual(camelRouteYaml);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('unsubscribes from the adapter and the events on unmount', () => {
    const unsubscribe = vi.fn();
    const onChange = vi.fn();
    const { unmount } = render(<SourceCodeProvider adapter={{ subscribe: () => unsubscribe, onChange }} />);

    unmount();
    act(() => {
      EventNotifier.getInstance().next('entities:updated', 'after unmount');
    });

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('localStorageSourceCodeAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delivers the stored document, or an empty list when nothing is stored', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce(null).mockReturnValueOnce('stored');
    const apply = vi.fn();

    localStorageSourceCodeAdapter.subscribe(apply);
    localStorageSourceCodeAdapter.subscribe(apply);

    expect(getItem).toHaveBeenCalledWith(LocalStorageKeys.SourceCode);
    expect(apply).toHaveBeenNthCalledWith(1, { code: '[]' });
    expect(apply).toHaveBeenNthCalledWith(2, { code: 'stored' });
  });

  it('persists editor changes', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    localStorageSourceCodeAdapter.onChange?.('new code');

    expect(setItem).toHaveBeenCalledWith(LocalStorageKeys.SourceCode, 'new code');
  });

  it('starts with an empty list when the storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const apply = vi.fn();

    expect(() => localStorageSourceCodeAdapter.subscribe(apply)).not.toThrow();

    expect(apply).toHaveBeenCalledWith({ code: '[]' });
    expect(error).toHaveBeenCalledOnce();
  });

  it('does not throw when an editor change cannot be persisted', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => localStorageSourceCodeAdapter.onChange?.('new code')).not.toThrow();

    expect(error).toHaveBeenCalledOnce();
  });
});
