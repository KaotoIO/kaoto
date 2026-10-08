import { ButtonVariant } from '@patternfly/react-core';
import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { EntityType } from '../../../../models/entities';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { ACTION_ID_CANCEL, ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { createMockEntitiesContext } from '../../../../stubs';
import {
  IInteractionType,
  IModalCustomization,
  INodeInteractionAddonContext,
  IOnDeleteAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { useDeleteStep } from './delete-step.hook';

describe('useDeleteStep', () => {
  const camelResource = new CamelRouteResource();
  let mockVizNode: IVisualizationNode;
  let mockEntitiesContext: EntitiesContextResult;

  beforeAll(async () => {
    mockEntitiesContext = await createMockEntitiesContext(camelResource);
  });

  const mockActionConfirmationModalContext = {
    actionConfirmation: vi.fn(),
  };

  const getRegisteredInteractionAddons = vi.fn<INodeInteractionAddonContext['getRegisteredInteractionAddons']>();
  const mockNodeInteractionAddonContext: INodeInteractionAddonContext = {
    registerInteractionAddon: vi.fn(),
    getRegisteredInteractionAddons,
  };
  /** An ON_DELETE addon registered for every node, so the real item-interaction-helper processes it */
  let onDeleteAddon: IOnDeleteAddon;

  beforeEach(() => {
    mockVizNode = createVisualizationNode('test-step', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.removeChild = vi.fn();
    mockVizNode.getChildren = vi.fn().mockReturnValue([]);
    onDeleteAddon = { type: IInteractionType.ON_DELETE, activationFn: () => true, callback: vi.fn() };
    getRegisteredInteractionAddons.mockReset().mockReturnValue([onDeleteAddon]);
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
    mockVizNode.getChildren = vi.fn().mockReturnValue([]);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(mockVizNode.removeChild).toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
    expect(onDeleteAddon.callback).toHaveBeenCalledWith({ vizNode: mockVizNode, modalAnswer: ACTION_ID_CONFIRM });
  });

  it('should delete step without confirmation when only placeholder child', async () => {
    const placeholderChild = createVisualizationNode('placeholder', {
      name: EntityType.Route,
      isPlaceholder: true,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.getChildren = vi.fn().mockReturnValue([placeholderChild]);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(mockVizNode.removeChild).toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should show confirmation modal when step has non-placeholder children', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.getChildren = vi.fn().mockReturnValue([nonPlaceholderChild]);
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
    const nonPlaceholderChild = createVisualizationNode('child', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.getChildren = vi.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();
    expect(mockVizNode.removeChild).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(onDeleteAddon.callback).not.toHaveBeenCalled();
  });

  it('should not delete step when modal returns undefined', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.getChildren = vi.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockVizNode.removeChild).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
  });

  it('should handle modal customizations from interaction addons', async () => {
    const buttonOptions = {
      confirm: { buttonText: 'Remove Step', variant: ButtonVariant.danger },
      cancel: { buttonText: 'Keep Step', variant: ButtonVariant.link },
    };
    const mockModalCustomization: IModalCustomization = {
      additionalText: 'Custom warning text',
      buttonOptions,
    };
    getRegisteredInteractionAddons.mockReturnValue([{ ...onDeleteAddon, modalCustomization: mockModalCustomization }]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);

    const { result } = renderHook(() => useDeleteStep(mockVizNode), { wrapper });

    await result.current.onDeleteStep();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Permanently delete step?',
      text: 'Step and its children will be lost.',
      additionalModalText: 'Custom warning text',
      buttonOptions,
    });
  });

  it('should show confirmation modal when modal customizations exist even without children', async () => {
    const mockModalCustomization: IModalCustomization = {
      additionalText: 'Custom text',
      buttonOptions: {},
    };
    getRegisteredInteractionAddons.mockReturnValue([{ ...onDeleteAddon, modalCustomization: mockModalCustomization }]);
    mockVizNode.getChildren = vi.fn().mockReturnValue([]);
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

    expect(getRegisteredInteractionAddons).toHaveBeenCalledWith(IInteractionType.ON_DELETE, mockVizNode);
  });
});
