import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { ACTION_ID_CANCEL, ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import {
  IInteractionType,
  INodeInteractionAddonContext,
} from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import {
  findOnDeleteModalCustomizationRecursively,
  processOnDeleteAddonRecursively,
} from '../ContextMenu/item-interaction-helper';
import { useDeleteStep } from './delete-step.hook';

jest.mock('../ContextMenu/item-interaction-helper', () => ({
  findOnDeleteModalCustomizationRecursively: jest.fn(),
  processOnDeleteAddonRecursively: jest.fn(),
}));

describe('useDeleteStep', () => {
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
    mockVizNode = createVisualizationNode('test-step', {});
    mockVizNode.removeChild = jest.fn();
    mockVizNode.getChildren = jest.fn().mockReturnValue([]);
    (findOnDeleteModalCustomizationRecursively as jest.Mock).mockReturnValue([]);
    (processOnDeleteAddonRecursively as jest.Mock).mockImplementation(() => {});
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

  it('should return onDeleteStep function', () => {
    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    expect(result.current.onDeleteStep).toBeDefined();
    expect(typeof result.current.onDeleteStep).toBe('function');
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should delete step without confirmation when no children', async () => {
    mockVizNode.getChildren = jest.fn().mockReturnValue([]);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(mockVizNode.removeChild).toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
    expect(processOnDeleteAddonRecursively).toHaveBeenCalledWith(mockVizNode, ACTION_ID_CONFIRM, expect.any(Function));
  });

  it('should delete step without confirmation when only placeholder child', async () => {
    const placeholderChild = createVisualizationNode('placeholder', { isPlaceholder: true });
    mockVizNode.getChildren = jest.fn().mockReturnValue([placeholderChild]);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(mockVizNode.removeChild).toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should show confirmation modal when step has non-placeholder children', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', { isPlaceholder: false });
    mockVizNode.getChildren = jest.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Permanently delete step?',
      text: 'Step and its children will be lost.',
      additionalModalText: undefined,
      buttonOptions: undefined,
    });
    expect(mockVizNode.removeChild).toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should not delete step when modal is cancelled', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', { isPlaceholder: false });
    mockVizNode.getChildren = jest.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();
    expect(mockVizNode.removeChild).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(processOnDeleteAddonRecursively).not.toHaveBeenCalled();
  });

  it('should not delete step when modal returns undefined', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', { isPlaceholder: false });
    mockVizNode.getChildren = jest.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockVizNode.removeChild).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
  });

  it('should handle modal customizations from interaction addons', async () => {
    const mockModalCustomization = {
      additionalText: 'Custom warning text',
      buttonOptions: { confirm: 'Remove Step', cancel: 'Keep Step' },
    };
    (findOnDeleteModalCustomizationRecursively as jest.Mock).mockReturnValue([mockModalCustomization]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Permanently delete step?',
      text: 'Step and its children will be lost.',
      additionalModalText: 'Custom warning text',
      buttonOptions: { confirm: 'Remove Step', cancel: 'Keep Step' },
    });
  });

  it('should show confirmation modal when modal customizations exist even without children', async () => {
    const mockModalCustomization = {
      additionalText: 'Custom text',
      buttonOptions: undefined,
    };
    (findOnDeleteModalCustomizationRecursively as jest.Mock).mockReturnValue([mockModalCustomization]);
    mockVizNode.getChildren = jest.fn().mockReturnValue([]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();
    expect(mockVizNode.removeChild).toHaveBeenCalled();
  });

  it('should call getRegisteredInteractionAddons with correct parameters', async () => {
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(findOnDeleteModalCustomizationRecursively).toHaveBeenCalledWith(mockVizNode, expect.any(Function));

    const callback = (findOnDeleteModalCustomizationRecursively as jest.Mock).mock.calls[0][1];
    callback(mockVizNode);
    expect(mockNodeInteractionAddonContext.getRegisteredInteractionAddons).toHaveBeenCalledWith(
      IInteractionType.ON_DELETE,
      mockVizNode,
    );
  });
});
