import { CamelYamlDsl } from '@kaoto/camel-catalog/types';
import { render } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';
import { parse } from 'yaml';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { EntityType } from '../models/entities';
import { mockRandomValues, TestProvidersWrapper } from '../stubs';
import { VisibleFlowsContext, VisibleFlowsProvider } from './visible-flows.provider';

describe('VisibleFlowsProvider', () => {
  it('should initialize visible flows correctly', async () => {
    mockRandomValues();

    const baseResource = new CamelRouteResource();
    baseResource.addNewEntity(EntityType.Route);
    // Materialize the new entity into source so the wrapper's re-initialize()
    // (which rebuilds entities from source) preserves it — mirrors how runtime
    // recreates the resource from serialized code on `code:updated`.
    const camelResource = new CamelRouteResource(parse(baseResource.toString()) as CamelYamlDsl);

    const { Provider } = await TestProvidersWrapper({ camelResource });

    const wrapper = render(
      <Provider>
        <VisibleFlowsProvider>
          <MockComponent />
        </VisibleFlowsProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should initialize visible flows with an empty context', async () => {
    const camelResource = new CamelRouteResource();
    const { Provider } = await TestProvidersWrapper({ camelResource });

    const wrapper = render(
      <Provider>
        <VisibleFlowsProvider>
          <MockComponent />
        </VisibleFlowsProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});

const MockComponent: FunctionComponent = () => {
  const context = useContext(VisibleFlowsContext);

  return (
    <>
      <div data-testid="visible-flows">{JSON.stringify(context?.visibleFlows, undefined, 4)}</div>
      <div data-testid="all-flows-visible">{JSON.stringify(context?.allFlowsVisible, undefined, 4)}</div>
    </>
  );
};
