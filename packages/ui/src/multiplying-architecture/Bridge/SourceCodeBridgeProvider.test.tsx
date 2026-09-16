import { act, render, waitFor } from '@testing-library/react';
import { createRef, FunctionComponent, useLayoutEffect, useRef } from 'react';

import { SourceCodeSync } from '../../providers/source-code-sync';
import { useSourceCodeStore } from '../../store';
import { EventNotifier } from '../../utils/event-notifier';
import { SourceCodeBridgeProviderRef } from './editor-api';
import { SourceCodeBridgeProvider } from './SourceCodeBridgeProvider';

describe('SourceCodeBridgeProvider', () => {
  const mockCamelRoute = `
    - from:
        uri: "timer:foo"
        steps:
          - log:
              message: "Hello World"
  `;

  it('should render children', () => {
    const { getByText } = render(
      <SourceCodeBridgeProvider onNewEdit={vi.fn()}>
        <p>Test Child</p>
      </SourceCodeBridgeProvider>,
    );

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('pauses local history in host mode and restores tracking on unmount', () => {
    const history = { undo: vi.fn(), redo: vi.fn(), canUndo: true, canRedo: true };
    const { unmount } = render(<SourceCodeBridgeProvider history={history} onNewEdit={vi.fn()} />);
    act(() => {
      useSourceCodeStore.getState().setSourceCode('canvas change');
      useSourceCodeStore.getState().setCodeAndNotify('native undo result');
    });
    expect(useSourceCodeStore.temporal.getState().pastStates).toEqual([]);
    expect(useSourceCodeStore.temporal.getState().futureStates).toEqual([]);
    unmount();
    expect(useSourceCodeStore.temporal.getState().isTracking).toBe(true);
  });

  it('should call onNewEdit when the entities:updated event is emitted', () => {
    const mockOnNewEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <SourceCodeBridgeProvider onNewEdit={mockOnNewEdit}>
        <p>Love letter</p>
      </SourceCodeBridgeProvider>,
    );

    act(() => {
      EventNotifier.getInstance().next('entities:updated', mockCamelRoute);
    });

    expect(mockOnNewEdit).toHaveBeenCalledWith(mockCamelRoute);
  });

  it('should ignore the first code:updated event', () => {
    const mockOnNewEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <SourceCodeBridgeProvider onNewEdit={mockOnNewEdit}>
        <p>Love letter</p>
      </SourceCodeBridgeProvider>,
    );

    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: mockCamelRoute });
    });

    expect(mockOnNewEdit).not.toHaveBeenCalledWith(mockCamelRoute);
  });

  it('should call onNewEdit when the code:updated event if there is source code available', () => {
    const mockOnNewEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <SourceCodeBridgeProvider onNewEdit={mockOnNewEdit}>
        <p>Love letter</p>
      </SourceCodeBridgeProvider>,
    );

    act(() => {
      EventNotifier.getInstance().next(
        'entities:updated',
        `- from:
            uri: "direct:foo"
            steps: []`,
      );
      mockOnNewEdit.mockClear();
    });

    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: mockCamelRoute });
    });

    expect(mockOnNewEdit).toHaveBeenCalledWith(mockCamelRoute);
    expect(mockOnNewEdit).toHaveBeenCalledTimes(1);
  });

  it('logs an error and still updates the source ref when onNewEdit rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockOnNewEdit = vi.fn().mockRejectedValue(new Error('edit boom'));

    render(
      <SourceCodeBridgeProvider onNewEdit={mockOnNewEdit}>
        <p>Complaint letter</p>
      </SourceCodeBridgeProvider>,
    );

    await act(async () => {
      EventNotifier.getInstance().next('entities:updated', mockCamelRoute);
    });

    expect(mockOnNewEdit).toHaveBeenCalledWith(mockCamelRoute);
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to apply edit:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('should unsubscribe from events on unmount', async () => {
    const eventNotifierInstance = EventNotifier.getInstance();
    const unsubscribeFromEntitiesMock = vi.fn();
    const unsubscribeFromSourceCodeMock = vi.fn();

    vi.spyOn(eventNotifierInstance, 'subscribe').mockReturnValueOnce(unsubscribeFromEntitiesMock);
    vi.spyOn(eventNotifierInstance, 'subscribe').mockReturnValueOnce(unsubscribeFromSourceCodeMock);

    const { unmount } = render(
      <SourceCodeBridgeProvider onNewEdit={async () => {}}>
        <p>Tax statement letter</p>
      </SourceCodeBridgeProvider>,
    );

    await act(async () => {
      unmount();
    });

    expect(unsubscribeFromEntitiesMock).toHaveBeenCalled();
    expect(unsubscribeFromSourceCodeMock).toHaveBeenCalled();
  });

  it('reports the first source edit after empty host initialization', async () => {
    const ref = createRef<SourceCodeBridgeProviderRef>();
    const onNewEdit = vi.fn().mockResolvedValue(undefined);
    render(<SourceCodeBridgeProvider ref={ref} onNewEdit={onNewEdit} />);
    await act(async () => {
      await ref.current!.setContent('empty.camel.yaml', '');
    });
    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: 'first edit' });
    });
    expect(onNewEdit).toHaveBeenCalledExactlyOnceWith('first edit');
  });

  it('reports the first edit when host initialization precedes passive subscriptions', () => {
    const onNewEdit = vi.fn().mockResolvedValue(undefined);
    const Host = () => {
      const ref = useRef<SourceCodeBridgeProviderRef>(null);
      useLayoutEffect(() => {
        void ref.current!.setContent('empty.camel.yaml', '');
      }, []);
      return <SourceCodeBridgeProvider ref={ref} onNewEdit={onNewEdit} />;
    };
    render(<Host />);
    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: 'first edit' });
    });
    expect(onNewEdit).toHaveBeenCalledExactlyOnceWith('first edit');
  });

  it('publishes matching entity and source notifications only once', () => {
    const onNewEdit = vi.fn().mockResolvedValue(undefined);
    render(<SourceCodeBridgeProvider onNewEdit={onNewEdit} />);
    act(() => {
      EventNotifier.getInstance().next('entities:updated', mockCamelRoute);
      EventNotifier.getInstance().next('code:updated', { code: mockCamelRoute });
    });
    expect(onNewEdit).toHaveBeenCalledExactlyOnceWith(mockCamelRoute);
  });

  it('should not call setContent if the new content is the same as the current one', () => {
    const setCodeAndNotifySpy = vi.spyOn(useSourceCodeStore.getState(), 'setCodeAndNotify');
    const wrapper = render(<EnvelopeProviderTestingBed />);

    act(() => {
      wrapper.getByText('Set Content').click();
    });

    act(() => {
      wrapper.getByText('Set Content').click();
    });

    expect(setCodeAndNotifySpy).toHaveBeenCalledTimes(1);

    setCodeAndNotifySpy.mockRestore();
  });

  it('does not call onNewEdit for the empty initial code emitted on mount', () => {
    const mockOnNewEdit = vi.fn().mockResolvedValue(undefined);

    render(
      <SourceCodeSync>
        <SourceCodeBridgeProvider onNewEdit={mockOnNewEdit}>
          <p>Mounting letter</p>
        </SourceCodeBridgeProvider>
      </SourceCodeSync>,
    );

    expect(mockOnNewEdit).not.toHaveBeenCalled();
  });
});

const EnvelopeProviderTestingBed: FunctionComponent = () => {
  const envelopeRef = useRef<SourceCodeBridgeProviderRef>(null);

  return (
    <SourceCodeBridgeProvider ref={envelopeRef} onNewEdit={vi.fn()}>
      <button
        type="button"
        onClick={() => {
          void envelopeRef.current?.setContent(
            'test.camel.yaml',
            `- from:
            uri: "timer:foo"
            steps: []
            `,
          );
        }}
      >
        Set Content
      </button>
    </SourceCodeBridgeProvider>
  );
};
