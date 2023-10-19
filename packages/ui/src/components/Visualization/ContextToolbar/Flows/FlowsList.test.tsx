import { FlowsList } from './FlowsList';
import { act, fireEvent, render } from '@testing-library/react';
import { SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { EntitiesContextResult } from '../../../../hooks';
import { VisualFlowsApi } from '../../../../models/visualization/flows/flows-visibility';

//jest.mock(visibleFlov)
const getContextValue = () => {
  return {
    currentSchemaType: SourceSchemaType.Integration,
    visualEntities: [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity],
    visibleFlows: { ['entity1']: true, ['entity2']: false },
  } as unknown as EntitiesContextResult;
};
describe('FlowsList.tsx', () => {
  // @ts-ignore
  let contextValue = getContextValue();
  //});

  const renderWithContext = () => {
    return render(
      <EntitiesContext.Provider value={contextValue}>
        <FlowsList />
      </EntitiesContext.Provider>,
    );
  };
  test('should render the existing flows', async () => {
    const wrapper = renderWithContext();
    const flows = await wrapper.findAllByTestId(/flows-list-row-*/);

    expect(flows).toHaveLength(2);
  });

  test('should display an empty state when there is no routes available', async () => {
    //useFlowsStore.getState().deleteAllFlows();
    contextValue = { ...contextValue, visualEntities: [], visibleFlows: {} };
    const wrapper = renderWithContext();

    const emptyState = await wrapper.findByTestId('empty-state');

    expect(emptyState).toBeInTheDocument();
  });

  test('should render the flows ids', async () => {
    const cont = getContextValue();
    contextValue = cont;
    const wrapper = await renderWithContext();
    const flow1 = await wrapper.findByText('entity1');
    const flow2 = await wrapper.findByText('entity2');

    expect(flow1).toBeInTheDocument();
    expect(flow2).toBeInTheDocument();
  });

  test('should make the selected flow visible by clicking on its ID', async () => {
    let resId = '';
    const visFlowApi = new VisualFlowsApi(jest.fn);
    jest.spyOn(visFlowApi, 'toggleFlowVisible').mockImplementation((id: string) => {
      resId = id;
    });

    contextValue = { ...contextValue, visualFlowsApi: visFlowApi };

    const wrapper = renderWithContext();
    const flowId = await wrapper.findByTestId('goto-btn-entity1');

    act(() => {
      fireEvent.click(flowId);
    });

    expect(resId).toBe('entity1');
  });

  test('should call onClose when clicking on a flow ID', async () => {
    const onCloseSpy = jest.fn();
    const wrapper = render(
      <EntitiesContext.Provider value={contextValue}>
        <FlowsList onClose={onCloseSpy} />
      </EntitiesContext.Provider>,
    );
    const flowId = await wrapper.findByTestId('goto-btn-entity1');

    act(() => {
      fireEvent.click(flowId);
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  test('should toggle the visibility of a flow clicking on the Eye icon', async () => {
    let resId = '';
    const visFlowApi = new VisualFlowsApi(jest.fn);
    jest.spyOn(visFlowApi, 'toggleFlowVisible').mockImplementation((id: string) => {
      resId = id;
    });

    contextValue = { ...contextValue, visualFlowsApi: visFlowApi };
    const wrapper = renderWithContext();
    const toggleFlowId = await wrapper.findByTestId('toggle-btn-entity1');

    act(() => {
      fireEvent.click(toggleFlowId);
    });

    expect(resId).toEqual('entity1');
  });

  test('should render the appropiate Eye icon', async () => {
    const wrapper = renderWithContext();
    const flow1 = await wrapper.findByTestId('toggle-btn-entity1-visible');
    expect(flow1).toBeInTheDocument();

    /** Eye slash icon */
    const flow2 = await wrapper.findByTestId('toggle-btn-entity2-hidden');
    expect(flow2).toBeInTheDocument();
  });
});
