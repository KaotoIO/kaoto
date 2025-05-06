import { act, fireEvent, render } from '@testing-library/react';
import { CamelRouteResource } from '../../../../models/camel';
import { EntityType } from '../../../../models/camel/entities';
import { VisualFlowsApi } from '../../../../models/visualization/flows/support/flows-visibility';
import {
  ActionConfirmationModalContext,
  ActionConfirmationModalContextProvider,
} from '../../../../providers/action-confirmation-modal.provider';
import { VisibleFlowsContextResult } from '../../../../providers/visible-flows.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { FlowsList } from './FlowsList';

describe('FlowsList.tsx', () => {
  let camelResource: CamelRouteResource;

  beforeEach(() => {
    camelResource = new CamelRouteResource();
    camelResource.addNewEntity(EntityType.Route);
    camelResource.addNewEntity(EntityType.RouteConfiguration);
  });

  it('should render the existing flows', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const flows = await wrapper.findAllByTestId(/flows-list-row-*/);

    expect(flows).toHaveLength(2);
  });

  it('should display an empty state when there is no routes available', async () => {
    camelResource.removeEntity(['route-1234']);
    camelResource.removeEntity(['routeConfiguration-1234']);
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const emptyState = await wrapper.findByTestId('empty-state');

    expect(emptyState).toBeInTheDocument();
  });

  it('should render the flows ids', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );
    const flow1 = await wrapper.findByText('route-1234');
    const flow2 = await wrapper.findByText('routeConfiguration-1234');

    expect(flow1).toBeInTheDocument();
    expect(flow2).toBeInTheDocument();
  });

  it('should make the selected flow visible by clicking on its ID', async () => {
    let resId = '';
    const visualFlowsApi = new VisualFlowsApi(jest.fn);
    jest.spyOn(visualFlowsApi, 'toggleFlowVisible').mockImplementation((id: string) => {
      resId = id;
    });

    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: false,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: false },
      visualFlowsApi,
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );
    const flowId = await wrapper.findByTestId('goto-btn-route-1234');

    act(() => {
      fireEvent.click(flowId);
    });

    expect(resId).toBe('route-1234');
  });

  it('should call onClose when clicking on a flow ID', async () => {
    const onCloseSpy = jest.fn();
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <FlowsList onClose={onCloseSpy} />
      </Provider>,
    );

    const flowId = await wrapper.findByTestId('goto-btn-route-1234');

    act(() => {
      fireEvent.click(flowId);
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it('should show delete confirmation modal when clicking on a delete icon', async () => {
    const mockDeleteModalContext = {
      actionConfirmation: jest.fn(),
    };

    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <ActionConfirmationModalContext.Provider value={mockDeleteModalContext}>
          <FlowsList />
        </ActionConfirmationModalContext.Provider>
      </Provider>,
    );

    await act(async () => {
      fireEvent.click(wrapper.getByTestId('delete-btn-route-1234'));
    });

    expect(mockDeleteModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: "Do you want to delete the 'route-1234' Route?",
      text: 'All steps will be lost.',
    });
  });

  it('should delete a flow when clicking the delete icon and then clicking delete', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <ActionConfirmationModalContextProvider>
          <FlowsList />
        </ActionConfirmationModalContextProvider>
      </Provider>,
    );

    await act(async () => {
      const deleteBtn = wrapper.getByTestId('delete-btn-route-1234');
      fireEvent.click(deleteBtn);
    });

    await act(async () => {
      const actionConfirmationModalBtnConfirm = wrapper.getByTestId('action-confirmation-modal-btn-confirm');
      fireEvent.click(actionConfirmationModalBtnConfirm);
    });

    expect(camelResource.getVisualEntities()).toHaveLength(1);
  });

  it('should not delete a flow when clicking the delete icon and then clicking cancel', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <ActionConfirmationModalContextProvider>
          <FlowsList />
        </ActionConfirmationModalContextProvider>
      </Provider>,
    );

    await act(async () => {
      const deleteBtn = wrapper.getByTestId('delete-btn-route-1234');
      fireEvent.click(deleteBtn);
    });

    await act(async () => {
      const actionConfirmationModalBtnCancel = wrapper.getByTestId('action-confirmation-modal-btn-cancel');
      fireEvent.click(actionConfirmationModalBtnCancel);
    });

    expect(camelResource.getVisualEntities()).toHaveLength(2);
  });

  it('should toggle the visibility of a flow clicking on the Eye icon', async () => {
    let resId = '';
    const visualFlowsApi = new VisualFlowsApi(jest.fn);
    jest.spyOn(visualFlowsApi, 'toggleFlowVisible').mockImplementation((id: string) => {
      resId = id;
    });

    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: false,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: false },
      visualFlowsApi,
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const toggleFlowId = await wrapper.findByTestId('toggle-btn-route-1234');

    await act(async () => {
      fireEvent.click(toggleFlowId);
    });

    expect(resId).toEqual('route-1234');
  });

  it('should render the appropriate Eye icon', async () => {
    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: false,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: false },
      visualFlowsApi: new VisualFlowsApi(jest.fn),
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const flow1 = await wrapper.findByTestId('toggle-btn-route-1234-visible');
    expect(flow1).toBeInTheDocument();

    /** Eye slash icon */
    const flow2 = await wrapper.findByTestId('toggle-btn-routeConfiguration-1234-hidden');
    expect(flow2).toBeInTheDocument();
  });

  it('should rename a flow', async () => {
    const visualFlowsApi = new VisualFlowsApi(jest.fn);
    const renameSpy = jest.spyOn(visualFlowsApi, 'renameFlow');

    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: false,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: false },
      visualFlowsApi,
    };

    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext,
    });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    await act(async () => {
      const entityOnePencilIcon = await wrapper.findByTestId('goto-btn-route-1234--edit');
      fireEvent.click(entityOnePencilIcon);
    });

    await act(async () => {
      const input = await wrapper.findByDisplayValue('route-1234');
      fireEvent.change(input, { target: { value: 'new-name' } });
      fireEvent.blur(input);
    });

    await act(async () => {
      const entityOnePencilIcon = await wrapper.findByTestId('goto-btn-route-1234--save');
      fireEvent.click(entityOnePencilIcon);
    });

    expect(renameSpy).toHaveBeenCalledWith('route-1234', 'new-name');
    expect(camelResource.getVisualEntities()[0].id).toEqual('new-name');
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
  });

  it('should show all flows when not all flows are visible', async () => {
    const visualFlowsApi = new VisualFlowsApi(jest.fn);
    const showAllFlowsSpy = jest.spyOn(visualFlowsApi, 'showFlows');

    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: false,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: false },
      visualFlowsApi,
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const toggleAllFlows = await wrapper.findByTestId('toggle-btn-all-flows');

    act(() => {
      fireEvent.click(toggleAllFlows);
    });

    expect(showAllFlowsSpy).toHaveBeenCalledTimes(1);
  });

  it('should hide all flows when all flows are visible', async () => {
    const visualFlowsApi = new VisualFlowsApi(jest.fn);
    const hideAllFlowsSpy = jest.spyOn(visualFlowsApi, 'hideFlows');

    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: true,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: true },
      visualFlowsApi,
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const toggleAllFlows = await wrapper.findByTestId('toggle-btn-all-flows');

    act(() => {
      fireEvent.click(toggleAllFlows);
    });

    expect(hideAllFlowsSpy).toHaveBeenCalledTimes(1);
  });

  it('should set the appropriate title when all flows are visible', async () => {
    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: true,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: true },
      visualFlowsApi: new VisualFlowsApi(jest.fn),
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const toggleAllFlows = await wrapper.findByTestId('toggle-btn-all-flows');

    expect(toggleAllFlows).toHaveAttribute('title', 'Hide all flows');
  });

  it('should set the appropriate title when some flows are visible', async () => {
    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: false,
      visibleFlows: { ['route-1234']: true, ['routeConfiguration-1234']: false },
      visualFlowsApi: new VisualFlowsApi(jest.fn),
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    const toggleAllFlows = await wrapper.findByTestId('toggle-btn-all-flows');

    expect(toggleAllFlows).toHaveAttribute('title', 'Show all flows');
  });

  it('should filter flows based on the search input', async () => {
    const visibleFlowsContext: VisibleFlowsContextResult = {
      allFlowsVisible: false,
      visibleFlows: {
        ['route-1234']: false,
        ['routeConfiguration-1234']: true,
      },
      visualFlowsApi: new VisualFlowsApi(jest.fn),
    };

    const { Provider } = TestProvidersWrapper({ camelResource, visibleFlowsContext });
    const wrapper = render(
      <Provider>
        <FlowsList />
      </Provider>,
    );

    // Verify all flows are initially displayed
    let flows = await wrapper.findAllByTestId(/flows-list-row-*/);
    expect(flows).toHaveLength(2);

    // Simulate typing into the search input
    const searchInput = wrapper.getByRole('textbox', { name: 'search' });
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'route-1234' } });
    });

    // Verify only the matching flow is displayed
    flows = await wrapper.findAllByTestId(/flows-list-row-*/);
    expect(flows).toHaveLength(1);
    expect(wrapper.getByTestId('flows-list-row-route-1234')).toBeInTheDocument();

    // Clear the search input
    const clearButton = wrapper.getByRole('button', { name: 'Reset' });
    act(() => {
      fireEvent.click(clearButton);
    });

    // Verify all flows are displayed again
    flows = await wrapper.findAllByTestId(/flows-list-row-*/);
    expect(flows).toHaveLength(2);
  });

  it('should delete filtered flows when clicking the delete filtered button', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <ActionConfirmationModalContextProvider>
          <FlowsList />
        </ActionConfirmationModalContextProvider>
      </Provider>,
    );

    // Simulate typing into the search input to filter flows
    const searchInput = wrapper.getByRole('textbox', { name: 'search' });
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'route-1234' } });
    });

    // Click the delete filtered button
    const deleteFilteredBtn = wrapper.getByTestId('delete-filtered-btn');
    await act(async () => {
      fireEvent.click(deleteFilteredBtn);
    });

    // Confirm the deletion in the modal
    const confirmBtn = wrapper.getByTestId('action-confirmation-modal-btn-confirm');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Verify only the filtered flow is deleted
    expect(camelResource.getVisualEntities()).toHaveLength(1);
    expect(camelResource.getVisualEntities()[0].id).toBe('routeConfiguration-1234');
  });

  it('should not delete any flows when canceling the delete filtered action', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <ActionConfirmationModalContextProvider>
          <FlowsList />
        </ActionConfirmationModalContextProvider>
      </Provider>,
    );

    // Simulate typing into the search input to filter flows
    const searchInput = wrapper.getByRole('textbox', { name: 'search' });
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'route-1234' } });
    });

    // Click the delete filtered button
    const deleteFilteredBtn = wrapper.getByTestId('delete-filtered-btn');
    await act(async () => {
      fireEvent.click(deleteFilteredBtn);
    });

    // Cancel the deletion in the modal
    const cancelBtn = wrapper.getByTestId('action-confirmation-modal-btn-cancel');
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    // Verify no flows are deleted
    expect(camelResource.getVisualEntities()).toHaveLength(2);
  });
});
