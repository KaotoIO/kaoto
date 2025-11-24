import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { createVisualizationNode, DefinedComponent, IVisualizationNode } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import {
  IInteractionType,
  IOnDeleteAddon,
  IRegisteredInteractionAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
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

  it('should process addon when replacing', async () => {
    const mockCatalogModalContext = {
      setIsModalOpen: jest.fn(),
      getNewComponent: () => Promise.resolve({} as DefinedComponent),
      checkCompatibility: jest.fn(),
    };
    const mockReplaceModalContext = {
      actionConfirmation: () => Promise.resolve(ACTION_ID_CONFIRM),
    };
    const mockAddon = jest.fn();
    const mockNodeInteractionAddonContext = {
      registerInteractionAddon: jest.fn(),
      getRegisteredInteractionAddons: (
        _interaction: IInteractionType,
        _vizNode?: IVisualizationNode,
      ): IRegisteredInteractionAddon[] =>
        [
          { type: IInteractionType.ON_DELETE, activationFn: () => true, callback: mockAddon } as IOnDeleteAddon,
        ] as IRegisteredInteractionAddon[],
    };
    const wrapper = render(
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <ActionConfirmationModalContext.Provider value={mockReplaceModalContext}>
            <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
              <ItemReplaceStep vizNode={vizNode} loadActionConfirmationModal={false} />
            </NodeInteractionAddonContext.Provider>
          </ActionConfirmationModalContext.Provider>
        </CatalogModalContext.Provider>
      </EntitiesContext.Provider>,
    );
    act(() => {
      fireEvent.click(wrapper.getByText('Replace'));
    });
    await waitFor(() => {
      expect(mockAddon).toHaveBeenCalled();
    });
  });
});
