import { act, fireEvent, render } from '@testing-library/react';
import { EntitiesContextResult } from '../../../../hooks';
import { SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { IVisibleFlows, VisualFlowsApi } from '../../../../models/visualization/flows/support/flows-visibility';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { VisibleFLowsContextResult, VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { FlowsList } from './FlowsList';
import { camelRouteJson } from '../../../../stubs';

const getContextValue = () => {
  const visualEntity1 = new CamelRouteVisualEntity({ ...camelRouteJson.route, id: 'entity1' });
  const visualEntity2 = new CamelRouteVisualEntity({ ...camelRouteJson.route, id: 'entity2' });

  return {
    currentSchemaType: SourceSchemaType.Integration,
    visualEntities: [visualEntity1, visualEntity2],
    updateEntitiesFromCamelResource: jest.fn(),
  } as unknown as EntitiesContextResult;
};
const getVisibleFlowsContextValue = () => {
  return {
    visibleFlows: { ['entity1']: true, ['entity2']: false } as IVisibleFlows,
    visualFlowsApi: new VisualFlowsApi(jest.fn),
  };
};
let contextValue: EntitiesContextResult;
let visibleFlowsValue: VisibleFLowsContextResult;

const FlowsListWithContexts: React.FunctionComponent<{
  contextValue: EntitiesContextResult;
  visibleFlowsValue: VisibleFLowsContextResult;
  onClose?: () => void;
}> = ({ contextValue, visibleFlowsValue, onClose }) => {
  return (
    <EntitiesContext.Provider value={contextValue}>
      <VisibleFlowsContext.Provider value={visibleFlowsValue}>
        <FlowsList onClose={onClose ?? jest.fn} />
      </VisibleFlowsContext.Provider>
    </EntitiesContext.Provider>
  );
};

describe('FlowsList.tsx', () => {
  beforeEach(() => {
    contextValue = getContextValue();
    visibleFlowsValue = getVisibleFlowsContextValue();
  });

  it('should render the existing flows', async () => {
    const wrapper = render(<FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} />);
    const flows = await wrapper.findAllByTestId(/flows-list-row-*/);

    expect(flows).toHaveLength(2);
  });

  it('should display an empty state when there is no routes available', async () => {
    contextValue = { ...contextValue, visualEntities: [] };
    visibleFlowsValue = { ...visibleFlowsValue, visibleFlows: {} };
    const wrapper = render(<FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} />);

    const emptyState = await wrapper.findByTestId('empty-state');

    expect(emptyState).toBeInTheDocument();
  });

  it('should render the flows ids', async () => {
    const wrapper = render(<FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} />);
    const flow1 = await wrapper.findByText('entity1');
    const flow2 = await wrapper.findByText('entity2');

    expect(flow1).toBeInTheDocument();
    expect(flow2).toBeInTheDocument();
  });

  it('should make the selected flow visible by clicking on its ID', async () => {
    let resId = '';
    const visFlowApi = new VisualFlowsApi(jest.fn);
    jest.spyOn(visFlowApi, 'toggleFlowVisible').mockImplementation((id: string) => {
      resId = id;
    });
    visibleFlowsValue = { ...visibleFlowsValue, visualFlowsApi: visFlowApi };
    const wrapper = render(<FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} />);
    const flowId = await wrapper.findByTestId('goto-btn-entity1');

    act(() => {
      fireEvent.click(flowId);
    });

    expect(resId).toBe('entity1');
  });

  it('should call onClose when clicking on a flow ID', async () => {
    const onCloseSpy = jest.fn();

    const wrapper = render(
      <FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} onClose={onCloseSpy} />,
    );

    const flowId = await wrapper.findByTestId('goto-btn-entity1');

    act(() => {
      fireEvent.click(flowId);
    });

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });

  it('should toggle the visibility of a flow clicking on the Eye icon', async () => {
    let resId = '';
    const visFlowApi = new VisualFlowsApi(jest.fn);
    jest.spyOn(visFlowApi, 'toggleFlowVisible').mockImplementation((id: string) => {
      resId = id;
    });

    visibleFlowsValue = { ...getVisibleFlowsContextValue(), visualFlowsApi: visFlowApi };
    const wrapper = render(<FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} />);
    const toggleFlowId = await wrapper.findByTestId('toggle-btn-entity1');

    act(() => {
      fireEvent.click(toggleFlowId);
    });

    expect(resId).toEqual('entity1');
  });

  it('should render the appropriate Eye icon', async () => {
    const wrapper = render(<FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} />);
    const flow1 = await wrapper.findByTestId('toggle-btn-entity1-visible');
    expect(flow1).toBeInTheDocument();

    /** Eye slash icon */
    const flow2 = await wrapper.findByTestId('toggle-btn-entity2-hidden');
    expect(flow2).toBeInTheDocument();
  });

  it('should rename a flow', async () => {
    const visualFlowsApi = new VisualFlowsApi(jest.fn);
    const renameSpy = jest.spyOn(visualFlowsApi, 'renameFlow');

    visibleFlowsValue = { ...getVisibleFlowsContextValue(), visualFlowsApi };
    const wrapper = render(<FlowsListWithContexts contextValue={contextValue} visibleFlowsValue={visibleFlowsValue} />);

    await act(async () => {
      const entityOnePencilIcon = await wrapper.findByTestId('goto-btn-entity1--edit');
      fireEvent.click(entityOnePencilIcon);
    });

    await act(async () => {
      const input = await wrapper.findByDisplayValue('entity1');
      fireEvent.change(input, { target: { value: 'new-name' } });
      fireEvent.blur(input);
    });

    await act(async () => {
      const entityOnePencilIcon = await wrapper.findByTestId('goto-btn-entity1--save');
      fireEvent.click(entityOnePencilIcon);
    });

    expect(renameSpy).toHaveBeenCalledWith('entity1', 'new-name');
    expect(contextValue.visualEntities[0].id).toEqual('new-name');
    expect(contextValue.updateEntitiesFromCamelResource).toHaveBeenCalledTimes(1);
  });
});
