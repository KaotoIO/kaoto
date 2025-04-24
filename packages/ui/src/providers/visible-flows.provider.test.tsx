import { render } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';
import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { EntityType } from '../models/camel/entities';
import { TestProvidersWrapper } from '../stubs';
import { VisibleFlowsContext, VisibleFlowsProvider } from './visible-flows.provider';

describe('VisibleFlowsProvider', () => {
  it('should initialize visible flows correctly', () => {
    const camelResource = new CamelRouteResource();
    camelResource.addNewEntity(EntityType.Route);

    const { Provider } = TestProvidersWrapper({ camelResource });

    const wrapper = render(
      <Provider>
        <VisibleFlowsProvider>
          <MockComponent />
        </VisibleFlowsProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should initialize visible flows with an empty context', () => {
    const camelResource = new CamelRouteResource();
    const { Provider } = TestProvidersWrapper({ camelResource });

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
