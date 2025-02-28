import { act, render } from '@testing-library/react';
import { PropsWithChildren, useContext, useEffect } from 'react';
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
      <SourceCodeProvider>
        <TestProvider initialSourceCode={camelRouteYaml} />
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

    act(() => {
      wrapper.rerender(
        <SourceCodeProvider>
          <TestProvider initialSourceCode={camelRouteYaml} />
        </SourceCodeProvider>,
      );
    });

    expect(notifierSpy).toHaveBeenCalledWith('code:updated', { code: camelRouteYaml, path: undefined });
  });
});

function TestProvider(props: PropsWithChildren<{ initialSourceCode?: string }>) {
  const sourceCodeContext = useContext(SourceCodeContext);
  const sourceCodeApiContext = useContext(SourceCodeApiContext);

  useEffect(() => {
    sourceCodeApiContext.setCodeAndNotify(props.initialSourceCode ?? sourceCodeContext);
  }, [props.initialSourceCode, sourceCodeApiContext, sourceCodeContext]);

  return <span data-testid="source-code">{sourceCodeContext}</span>;
}
