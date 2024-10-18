import { fireEvent, render } from '@testing-library/react';
import { createVisualizationNode } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { ActionConfirmationModalContext } from '../../../../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ItemReplaceStep } from './ItemReplaceStep';

describe('ItemReplaceStep', () => {
  const vizNode = createVisualizationNode('test', {});

  const camelResource = new CamelRouteResource();
  const mockEntitiesContext = {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
    setCurrentSchemaType: jest.fn(),
  };

  const mockReplaceModalContext = {
    actionConfirmation: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render replace ContextMenuItem', () => {
    const { container } = render(<ItemReplaceStep vizNode={vizNode} loadActionConfirmationModal={false} />);

    expect(container).toMatchSnapshot();
  });

  it('should open replace confirmation modal on click', async () => {
    const childNode = createVisualizationNode('test', {});
    vizNode.addChild(childNode);

    const wrapper = render(
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <ActionConfirmationModalContext.Provider value={mockReplaceModalContext}>
          <ItemReplaceStep vizNode={vizNode} loadActionConfirmationModal={true} />
        </ActionConfirmationModalContext.Provider>
      </EntitiesContext.Provider>,
    );

    fireEvent.click(wrapper.getByText('Replace'));

    expect(mockReplaceModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Replace step?',
      text: 'Step and its children will be lost.',
    });
  });
});
