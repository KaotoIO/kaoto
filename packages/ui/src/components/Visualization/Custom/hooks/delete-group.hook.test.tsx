import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { EntityType } from '../../../../models/entities';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { ACTION_ID_CANCEL, ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { createMockEntitiesContext } from '../../../../stubs';
import {
  IInteractionType,
  INodeInteractionAddonContext,
} from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import {
  findOnDeleteModalCustomizationRecursively,
  processOnDeleteAddonRecursively,
} from '../ContextMenu/item-interaction-helper';
import { useDeleteGroup } from './delete-group.hook';

vi.mock('../ContextMenu/item-interaction-helper', () => ({
  findOnDeleteModalCustomizationRecursively: vi.fn(),
  processOnDeleteAddonRecursively: vi.fn(),
}));

describe('useDeleteGroup', () => {
  const camelResource = new CamelRouteResource();
  let mockVizNode: IVisualizationNode;
  let mockEntitiesContext: EntitiesContextResult;

  beforeAll(async () => {
    mockEntitiesContext = await createMockEntitiesContext(camelResource);
  });

  const mockActionConfirmationModalContext = {
    actionConfirmation: vi.fn(),
  };

  const mockNodeInteractionAddonContext: INodeInteractionAddonContext = {
    registerInteractionAddon: vi.fn(),
    getRegisteredInteractionAddons: vi.fn().mockReturnValue([]),
  };

  beforeEach(() => {
    mockVizNode = createVisualizationNode('test-group', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
    });
    (findOnDeleteModalCustomizationRecursively as Mock).mockReturnValue([]);
    (processOnDeleteAddonRecursively as Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
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
    const removeEntitySpy = vi.spyOn(camelResource, 'removeEntity');
    vi.spyOn(mockVizNode, 'getId').mockReturnValue('test-group');
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
    expect(processOnDeleteAddonRecursively).toHaveBeenCalledWith(mockVizNode, ACTION_ID_CONFIRM, expect.any(Function));
  });

  it('should not delete group when modal is cancelled', async () => {
    const removeEntitySpy = vi.spyOn(camelResource, 'removeEntity');
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

    const { result } = renderHook(() => useDeleteGroup(mockVizNode), { wrapper });

    await result.current.onDeleteGroup();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();
    expect(removeEntitySpy).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(processOnDeleteAddonRecursively).not.toHaveBeenCalled();
  });

  it('should not delete group when modal returns undefined', async () => {
    const removeEntitySpy = vi.spyOn(camelResource, 'removeEntity');
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
    vi.spyOn(mockVizNode, 'getId').mockReturnValue('test-group');
    (findOnDeleteModalCustomizationRecursively as Mock).mockReturnValue([mockModalCustomization]);
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

    expect(findOnDeleteModalCustomizationRecursively).toHaveBeenCalledWith(mockVizNode, expect.any(Function));

    const callback = (findOnDeleteModalCustomizationRecursively as Mock).mock.calls[0][1];
    callback(mockVizNode);
    expect(mockNodeInteractionAddonContext.getRegisteredInteractionAddons).toHaveBeenCalledWith(
      IInteractionType.ON_DELETE,
      mockVizNode,
    );
  });

  it('should handle vizNode without ID', async () => {
    const removeEntitySpy = vi.spyOn(camelResource, 'removeEntity');
    const vizNodeWithoutId = createVisualizationNode('id', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
    });
    vi.spyOn(vizNodeWithoutId, 'getId').mockReturnValueOnce(undefined);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteGroup(vizNodeWithoutId), { wrapper });

    await result.current.onDeleteGroup();

    expect(removeEntitySpy).toHaveBeenCalledWith(undefined);
  });
});
