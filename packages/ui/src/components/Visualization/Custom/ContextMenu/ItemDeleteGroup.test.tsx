import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { ItemDeleteGroup } from './ItemDeleteGroup';
import { EntityType } from '../../../../models/camel/entities';
import { TestProvidersWrapper } from '../../../../stubs';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';

describe('ItemDeleteGroup', () => {
  let vizNode: IVisualizationNode;
  const mockDeleteModalContext = {
    actionConfirmation: jest.fn(),
  };

  beforeEach(() => {
    vizNode = createVisualizationNode('test', {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render delete ContextMenuItem', () => {
    const { container } = render(<ItemDeleteGroup vizNode={vizNode} />);

    expect(container).toMatchSnapshot();
  });

  it('should open delete confirmation modal on click', async () => {
    const childNode = createVisualizationNode('test', {});
    vizNode.addChild(childNode);

    const wrapper = render(
      <ActionConfirmationModalContext.Provider value={mockDeleteModalContext}>
        <ItemDeleteGroup vizNode={vizNode} />
      </ActionConfirmationModalContext.Provider>,
    );

    fireEvent.click(wrapper.getByText('Delete'));

    expect(mockDeleteModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: "Do you want to delete the 'undefined' test?",
      text: 'All steps will be lost.',
    });
  });

  it('should call removeEntity if deletion is confirmed', async () => {
    const camelResource = new CamelRouteResource();
    const removeEntitySpy = jest.spyOn(camelResource, 'removeEntity');
    const entityId = camelResource.addNewEntity(EntityType.Route);
    vizNode = camelResource.getVisualEntities()[0].toVizNode();
    mockDeleteModalContext.actionConfirmation.mockResolvedValueOnce(ACTION_ID_CONFIRM);

    const { Provider } = TestProvidersWrapper({ camelResource });

    const wrapper = render(
      <Provider>
        <ActionConfirmationModalContext.Provider value={mockDeleteModalContext}>
          <ItemDeleteGroup vizNode={vizNode} />
        </ActionConfirmationModalContext.Provider>
      </Provider>,
    );

    act(() => {
      fireEvent.click(wrapper.getByText('Delete'));
    });

    await waitFor(() => {
      expect(removeEntitySpy).toHaveBeenCalledWith(entityId);
    });
  });
});
