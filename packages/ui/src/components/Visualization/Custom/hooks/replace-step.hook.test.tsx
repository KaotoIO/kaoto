import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { ITile } from '../../../../components/Catalog/Catalog.models';
import { StepUpdateAction } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import {
  ACTION_ID_CANCEL,
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
  CatalogModalContext,
  MetadataContext,
} from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { IMetadataApi } from '../../../../providers/metadata.provider';
import {
  IInteractionType,
  INodeInteractionAddonContext,
} from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import {
  findOnDeleteModalCustomizationRecursively,
  processOnDeleteAddonRecursively,
} from '../ContextMenu/item-interaction-helper';
import { useReplaceStep } from './replace-step.hook';

jest.mock('../ContextMenu/item-interaction-helper', () => ({
  findOnDeleteModalCustomizationRecursively: jest.fn(),
  processOnDeleteAddonRecursively: jest.fn(),
}));

describe('useReplaceStep', () => {
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

  const mockCatalogModalContext = {
    setIsModalOpen: jest.fn(),
    getNewComponent: jest.fn(),
    checkCompatibility: jest.fn(),
  };

  const mockMetadataContext: IMetadataApi = {
    onStepUpdated: jest.fn(),
    getMetadata: jest.fn(),
    setMetadata: jest.fn(),
    getResourceContent: jest.fn(),
    saveResourceContent: jest.fn(),
    deleteResource: jest.fn(),
    askUserForFileSelection: jest.fn(),
    getSuggestions: jest.fn(),
    shouldSaveSchema: false,
  };

  const mockActionConfirmationModalContext = {
    actionConfirmation: jest.fn(),
  };

  const mockNodeInteractionAddonContext: INodeInteractionAddonContext = {
    registerInteractionAddon: jest.fn(),
    getRegisteredInteractionAddons: jest.fn().mockReturnValue([]),
  };

  const mockDefinedComponent = {
    type: 'log',
    name: 'log-component',
    definition: { id: 'test-log', message: 'hello world' },
  };

  const mockCompatibleComponents = (item: ITile) => ['log', 'to'].includes(item.type);

  beforeEach(() => {
    mockVizNode = createVisualizationNode('test-step', {});
    mockVizNode.addBaseEntityStep = jest.fn();
    mockVizNode.getChildren = jest.fn().mockReturnValue([]);
    jest.spyOn(camelResource, 'getCompatibleComponents').mockReturnValue(mockCompatibleComponents);
    (findOnDeleteModalCustomizationRecursively as jest.Mock).mockReturnValue([]);
    (processOnDeleteAddonRecursively as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CatalogModalContext.Provider value={mockCatalogModalContext}>
        <MetadataContext.Provider value={mockMetadataContext}>
          <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
            <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
              {children}
            </NodeInteractionAddonContext.Provider>
          </ActionConfirmationModalContext.Provider>
        </MetadataContext.Provider>
      </CatalogModalContext.Provider>
    </EntitiesContext.Provider>
  );

  it('should return onReplaceNode function', () => {
    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    expect(result.current.onReplaceNode).toBeDefined();
    expect(typeof result.current.onReplaceNode).toBe('function');
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should return early when entitiesContext is null', async () => {
    const nullEntitiesWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <EntitiesContext.Provider value={null}>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={mockMetadataContext}>
            <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
              <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
                {children}
              </NodeInteractionAddonContext.Provider>
            </ActionConfirmationModalContext.Provider>
          </MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </EntitiesContext.Provider>
    );

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper: nullEntitiesWrapper });

    await result.current.onReplaceNode();

    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
  });

  it('should replace step without confirmation when no children', async () => {
    mockVizNode.getChildren = jest.fn().mockReturnValue([]);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(AddStepMode.ReplaceStep, mockVizNode.data);
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.ReplaceStep);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).toHaveBeenCalledWith(
      StepUpdateAction.Replace,
      mockDefinedComponent.type,
      mockDefinedComponent.name,
    );
  });

  it('should replace step without confirmation when only placeholder child', async () => {
    const placeholderChild = createVisualizationNode('placeholder', { isPlaceholder: true });
    mockVizNode.getChildren = jest.fn().mockReturnValue([placeholderChild]);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.ReplaceStep);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should show confirmation modal when step has non-placeholder children', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', { isPlaceholder: false });
    mockVizNode.getChildren = jest.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Replace step?',
      text: 'Step and its children will be lost.',
      additionalModalText: undefined,
      buttonOptions: undefined,
    });
    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.ReplaceStep);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should not replace step when modal is cancelled', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', { isPlaceholder: false });
    mockVizNode.getChildren = jest.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CANCEL);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();
    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
  });

  it('should not replace step when modal returns undefined', async () => {
    const nonPlaceholderChild = createVisualizationNode('child', { isPlaceholder: false });
    mockVizNode.getChildren = jest.fn().mockReturnValue([nonPlaceholderChild]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
  });

  it('should return early when catalog modal returns no component', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(null);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(AddStepMode.ReplaceStep, mockVizNode.data);
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).not.toHaveBeenCalled();
  });

  it('should return early when catalog modal returns undefined', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).not.toHaveBeenCalled();
  });

  it('should handle modal customizations from interaction addons', async () => {
    const mockModalCustomization = {
      additionalText: 'Custom replace warning',
      buttonOptions: { confirm: 'Replace Now', cancel: 'Keep Current' },
    };
    const nonPlaceholderChild = createVisualizationNode('child', { isPlaceholder: false });
    mockVizNode.getChildren = jest.fn().mockReturnValue([nonPlaceholderChild]);
    (findOnDeleteModalCustomizationRecursively as jest.Mock).mockReturnValue([mockModalCustomization]);
    mockActionConfirmationModalContext.actionConfirmation.mockResolvedValue(ACTION_ID_CONFIRM);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalledWith({
      title: 'Replace step?',
      text: 'Step and its children will be lost.',
      additionalModalText: 'Custom replace warning',
      buttonOptions: { confirm: 'Replace Now', cancel: 'Keep Current' },
    });
  });

  it('should call getRegisteredInteractionAddons with correct parameters', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(findOnDeleteModalCustomizationRecursively).toHaveBeenCalledWith(mockVizNode, expect.any(Function));

    const callback = (findOnDeleteModalCustomizationRecursively as jest.Mock).mock.calls[0][1];
    callback(mockVizNode);
    expect(mockNodeInteractionAddonContext.getRegisteredInteractionAddons).toHaveBeenCalledWith(
      IInteractionType.ON_DELETE,
      mockVizNode,
    );
  });

  it('should call processOnDeleteAddonRecursively with correct parameters', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(processOnDeleteAddonRecursively).toHaveBeenCalledWith(mockVizNode, ACTION_ID_CONFIRM, expect.any(Function));
  });

  it('should handle missing metadata context gracefully', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const noMetadataWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={undefined}>
            <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
              <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
                {children}
              </NodeInteractionAddonContext.Provider>
            </ActionConfirmationModalContext.Provider>
          </MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </EntitiesContext.Provider>
    );

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper: noMetadataWrapper });

    await result.current.onReplaceNode();

    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.ReplaceStep);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });
});
