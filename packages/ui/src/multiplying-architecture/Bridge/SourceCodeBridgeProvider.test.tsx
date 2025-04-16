import { act, render } from '@testing-library/react';
import { FunctionComponent, useRef } from 'react';
import { SourceCodeApiContext } from '../../providers';
import { EventNotifier } from '../../utils/event-notifier';
import { SourceCodeBridgeProvider } from './SourceCodeBridgeProvider';
import { SourceCodeBridgeProviderRef } from './editor-api';

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
      <SourceCodeBridgeProvider onNewEdit={jest.fn()}>
        <p>Test Child</p>
      </SourceCodeBridgeProvider>,
    );

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should call onNewEdit when the entities:updated event is emitted', () => {
    const mockOnNewEdit = jest.fn();

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
    const mockOnNewEdit = jest.fn();

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
    const mockOnNewEdit = jest.fn();

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

  it('should unsubscribe from events on unmount', () => {
    const eventNotifierInstance = EventNotifier.getInstance();
    const unsubscribeFromEntitiesMock = jest.fn();
    const unsubscribeFromSourceCodeMock = jest.fn();

    jest.spyOn(eventNotifierInstance, 'subscribe').mockReturnValueOnce(unsubscribeFromEntitiesMock);
    jest.spyOn(eventNotifierInstance, 'subscribe').mockReturnValueOnce(unsubscribeFromSourceCodeMock);

    const { unmount } = render(
      <SourceCodeBridgeProvider onNewEdit={async () => {}}>
        <p>Tax statement letter</p>
      </SourceCodeBridgeProvider>,
    );

    act(() => {
      unmount();
    });

    expect(unsubscribeFromEntitiesMock).toHaveBeenCalled();
    expect(unsubscribeFromSourceCodeMock).toHaveBeenCalled();
  });

  it('should not call setContent if the new content is the same as the current one', () => {
    const setCodeAndNotifyMock = jest.fn();
    const wrapper = render(<EnvelopeProviderTestingBed setCodeAndNotify={setCodeAndNotifyMock} />);

    act(() => {
      wrapper.getByText('Set Content').click();
    });

    act(() => {
      wrapper.getByText('Set Content').click();
    });

    expect(setCodeAndNotifyMock).toHaveBeenCalledTimes(1);
  });
});

const EnvelopeProviderTestingBed: FunctionComponent<{
  setCodeAndNotify: (sourceCode: string, path?: string) => void;
}> = ({ setCodeAndNotify }) => {
  const envelopeRef = useRef<SourceCodeBridgeProviderRef>(null);

  return (
    <SourceCodeApiContext.Provider value={{ setCodeAndNotify }}>
      <SourceCodeBridgeProvider ref={envelopeRef} onNewEdit={jest.fn()}>
        <button
          type="button"
          onClick={() => {
            envelopeRef.current?.setContent(
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
    </SourceCodeApiContext.Provider>
  );
};
