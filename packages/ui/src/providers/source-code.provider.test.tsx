import { act, fireEvent, render } from '@testing-library/react';
import { useContext, useRef } from 'react';
import { camelRouteYaml } from '../stubs/camel-route';
import { EventNotifier } from '../utils';
import { SourceCodeApiContext, SourceCodeContext, SourceCodeProvider } from './source-code.provider';

describe('SourceCodeProvider', () => {
  it('should start with an empty source code', () => {
    const wrapper = render(
      <SourceCodeProvider>
        <TestProvider />
      </SourceCodeProvider>,
    );

    act(() => {
      const elem = wrapper.getByTestId('source-code');
      expect(elem.textContent).toEqual('');
    });
  });

  it('should set the source code', () => {
    const wrapper = render(
      <SourceCodeProvider initialSourceCode={camelRouteYaml}>
        <TestProvider />
      </SourceCodeProvider>,
    );

    act(() => {
      const elem = wrapper.getByTestId('source-code');
      expect(elem.textContent).toEqual(camelRouteYaml);
    });
  });

  it('should notify subscribers when the source code is updated', () => {
    const wrapper = render(
      <SourceCodeProvider>
        <TestProvider />
      </SourceCodeProvider>,
    );

    const eventNotifier = EventNotifier.getInstance();
    const notifierSpy = jest.spyOn(eventNotifier, 'next');

    const input = wrapper.getByPlaceholderText('sourcecode') as HTMLInputElement;
    const button = wrapper.getByText('Update sourcecode');
    act(() => {
      fireEvent.change(input, { target: { value: camelRouteYaml } });
      fireEvent.click(button);
    });

    expect(notifierSpy).toHaveBeenCalledWith('code:updated', { code: camelRouteYaml, path: undefined });
  });
});

function TestProvider() {
  const sourceCodeContext = useContext(SourceCodeContext);
  const sourceCodeApiContext = useContext(SourceCodeApiContext);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const onClick = () => {
    const value = inputRef.current?.value;
    if (!value) {
      throw new Error('Input value is empty');
    }

    sourceCodeApiContext.setCodeAndNotify(value);
  };

  return (
    <>
      <span data-testid="source-code">{sourceCodeContext}</span>

      <textarea placeholder="sourcecode" name="sourcecode" ref={inputRef} />
      <button type="button" onClick={onClick}>
        Update sourcecode
      </button>
    </>
  );
}
