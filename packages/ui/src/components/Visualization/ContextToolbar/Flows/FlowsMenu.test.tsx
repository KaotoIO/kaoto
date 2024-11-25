import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { CamelResource, CamelRouteResource } from '../../../../models/camel';
import { EntityType } from '../../../../models/camel/entities';
import { VisibleFlowsContextResult } from '../../../../providers/visible-flows.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { FlowsMenu } from './FlowsMenu';

describe('FlowsMenu.tsx', () => {
  let camelResource: CamelResource;
  beforeEach(async () => {
    camelResource = new CamelRouteResource();
    camelResource.addNewEntity(EntityType.Route);
    camelResource.addNewEntity(EntityType.RouteConfiguration);
  });

  it('should open the flows list when clicking the dropdown', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <FlowsMenu />
      </Provider>,
    );

    const dropdown = await wrapper.findByTestId('flows-list-dropdown');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    /** Wait for the List to appear */
    await act(async () => {
      const flowsList = wrapper.queryByTestId('flows-list-table');
      expect(flowsList).toBeInTheDocument();
    });
  });

  it('should open the flows list when clicking the action button', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <FlowsMenu />
      </Provider>,
    );

    const dropdown = await wrapper.findByTestId('flows-list-btn');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    /** Wait for the List to appear */
    await act(async () => {
      const flowsList = wrapper.queryByTestId('flows-list-table');
      expect(flowsList).toBeInTheDocument();
    });
  });

  it('should close the flows list when pressing ESC', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <FlowsMenu />
      </Provider>,
    );

    const dropdown = await wrapper.findByTestId('flows-list-btn');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    const flowsList = await wrapper.findByTestId('flows-list-table');

    /** Press Escape key to close the menu */
    act(() => {
      fireEvent.focus(flowsList);
      fireEvent.keyDown(flowsList, { key: 'Escape', code: 'Escape', charCode: 27 });
    });

    /** Wait for the List to disappear */
    await waitFor(() => {
      expect(flowsList).not.toBeInTheDocument();
    });
  });

  it('should render the route id when a single route is visible', async () => {
    const singleFlowCamelResource = new CamelRouteResource();
    singleFlowCamelResource.addNewEntity(EntityType.Route);

    const { Provider } = TestProvidersWrapper({
      camelResource: singleFlowCamelResource,
      visibleFlowsContext: { visibleFlows: { ['route-1234']: true } } as unknown as VisibleFlowsContextResult,
    });
    const wrapper = render(
      <Provider>
        <FlowsMenu />
      </Provider>,
    );

    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('route-1234');
  });

  it('should NOT render the route id but "Routes" when there is no flow visible', async () => {
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: {
        visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: true },
      } as unknown as VisibleFlowsContextResult,
    });
    const wrapper = render(
      <Provider>
        <FlowsMenu />
      </Provider>,
    );
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('Routes');
  });

  it('should NOT render the route id but "Routes" when there is more than 1 flow visible', async () => {
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: {
        visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: true },
      } as unknown as VisibleFlowsContextResult,
    });
    const wrapper = render(
      <Provider>
        <FlowsMenu />
      </Provider>,
    );
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('Routes');
  });

  it('should render the visible routes count', async () => {
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: {
        visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: true },
      } as unknown as VisibleFlowsContextResult,
    });
    const wrapper = render(
      <Provider>
        <FlowsMenu />
      </Provider>,
    );

    const routeCount = await wrapper.findByTestId('flows-list-route-count');
    expect(routeCount).toHaveTextContent('2/2');
  });
});
