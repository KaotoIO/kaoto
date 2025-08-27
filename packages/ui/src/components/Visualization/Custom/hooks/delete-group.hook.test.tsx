import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { ACTION_ID_CANCEL, ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import {
  IInteractionAddonType,
  INodeInteractionAddonContext,
} from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import {
  findModalCustomizationRecursively,
  processNodeInteractionAddonRecursively,
} from '../ContextMenu/item-delete-helper';
import { useDeleteGroup } from './delete-group.hook';

jest.mock('../ContextMenu/item-delete-helper', () => ({
  findModalCustomizationRecursively: jest.fn(),
  processNodeInteractionAddonRecursively: jest.fn(),
}));

describe('useDeleteGroup', () => {
  const camelResource = new CamelRouteResource();
  let mockVizNode: IVisualizationNode;

  const mockEntitiesContext = {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
  };

  const mockActionConfirmationModalContext = {
    actionConfirmation: jest.fn(),
  };

  const mockNodeInteractionAddonContext: INodeInteractionAddonContext = {
    registerInteractionAddon: jest.fn(),
    getRegisteredInteractionAddons: jest.fn().mockReturnValue([]),
  };

  beforeEach(() => {
    mockVizNode = createVisualizationNode('test-group', {});
    (findModalCustomizationRecursively as jest.Mock).mockReturnValue([]);
    (processNodeInteractionAddonRecursively as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
        <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
          {children}
        </NodeInteractionAddonContext.Provider>
      </ActionConfirmationModalContext.Provider>
    </EntitiesContext.Provider>
  );

  it('should return onDeleteGroup function', () => {
    const { result } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    expect(result.current.onDeleteGroup).toBeDefined();
    expect(typeof result.current.onDeleteGroup).toBe('function');
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should show confirmation modal and delete group when confirmed', async () => {
    const removeEntitySpy = jest.spyOn(camelResource, 'removeEntity');
    jest.spyOn(mockVizNode, 'getId').mockReturnValue('test-group');
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    await result.current.onDeleteGroup();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: "Do you want to delete the 'test-group' " + mockVizNode.getNodeTitle() + '?',
      text: 'All steps will be lost.',
      additionalModalText: undefined,
      buttonOptions: undefined,
    });
    expect(removeEntitySpy).toHaveBeenCalledWith(['test-group']);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
    expect(processNodeInteractionAddonRecursively).toHaveBeenCalledWith(
      mockVizNode,
      ACTION_ID_CONFIRM,
      expect.any(Function),
    );
  });

  it('should not delete group when modal is cancelled', async () => {
    const removeEntitySpy = jest.spyOn(camelResource, 'removeEntity');
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

    const { result } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    await result.current.onDeleteGroup();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();
    expect(removeEntitySpy).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(processNodeInteractionAddonRecursively).not.toHaveBeenCalled();
  });

  it('should not delete group when modal returns undefined', async () => {
    const removeEntitySpy = jest.spyOn(camelResource, 'removeEntity');
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    await result.current.onDeleteGroup();

    expect(removeEntitySpy).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
  });

  it('should handle modal customizations from interaction addons', async () => {
    const mockModalCustomization = {
      additionalText: 'Custom additional text',
      buttonOptions: { confirm: 'Delete Now', cancel: 'Keep It' },
    };
    jest.spyOn(mockVizNode, 'getId').mockReturnValue('test-group');
    (findModalCustomizationRecursively as jest.Mock).mockReturnValue([mockModalCustomization]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    await result.current.onDeleteGroup();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: "Do you want to delete the 'test-group' " + mockVizNode.getNodeTitle() + '?',
      text: 'All steps will be lost.',
      additionalModalText: 'Custom additional text',
      buttonOptions: { confirm: 'Delete Now', cancel: 'Keep It' },
    });
  });

  it('should call getRegisteredInteractionAddons with correct parameters', async () => {
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    await result.current.onDeleteGroup();

    expect(findModalCustomizationRecursively).toHaveBeenCalledWith(mockVizNode, expect.any(Function));

    const callback = (findModalCustomizationRecursively as jest.Mock).mock.calls[0][1];
    callback(mockVizNode);
    expect(mockNodeInteractionAddonContext.getRegisteredInteractionAddons).toHaveBeenCalledWith(
      IInteractionAddonType.ON_DELETE,
      mockVizNode,
    );
  });

  it('should handle vizNode without ID', async () => {
    const removeEntitySpy = jest.spyOn(camelResource, 'removeEntity');
    const vizNodeWithoutId = createVisualizationNode('id', {});
    jest.spyOn(vizNodeWithoutId, 'getId').mockReturnValueOnce(undefined);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteGroup(vizNodeWithoutId), { wrapper });

    await result.current.onDeleteGroup();

    expect(removeEntitySpy).toHaveBeenCalledWith(undefined);
  });
});
