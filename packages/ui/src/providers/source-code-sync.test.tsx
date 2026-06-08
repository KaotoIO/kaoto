import { act, render } from '@testing-library/react';

import { useSourceCodeStore } from '../store';
import { camelRouteYaml } from '../stubs/camel-route';
import { EventNotifier } from '../utils';
import { SourceCodeSync } from './source-code-sync';

describe('SourceCodeSync', () => {
  beforeEach(() => {
    useSourceCodeStore.setState({ sourceCode: '', path: undefined });
  });

  it('seeds the store and emits code:updated on mount with the initial source code', () => {
    const nextSpy = jest.spyOn(EventNotifier.getInstance(), 'next');

    render(
      <SourceCodeSync initialSourceCode={camelRouteYaml}>
        <div />
      </SourceCodeSync>,
    );

    expect(useSourceCodeStore.getState().sourceCode).toEqual(camelRouteYaml);
    expect(nextSpy).toHaveBeenCalledWith('code:updated', { code: camelRouteYaml, path: undefined });

    nextSpy.mockRestore();
  });

  it('clears the undo/redo history on mount', () => {
    const clearSpy = jest.spyOn(useSourceCodeStore.temporal.getState(), 'clear');

    render(
      <SourceCodeSync>
        <div />
      </SourceCodeSync>,
    );

    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });

  it('updates the store source code upon an entities:updated notification', () => {
    render(
      <SourceCodeSync>
        <div />
      </SourceCodeSync>,
    );

    act(() => {
      EventNotifier.getInstance().next('entities:updated', camelRouteYaml);
    });

    expect(useSourceCodeStore.getState().sourceCode).toEqual(camelRouteYaml);
  });
});
