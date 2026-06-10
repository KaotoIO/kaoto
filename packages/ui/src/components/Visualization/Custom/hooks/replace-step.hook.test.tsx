import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { Mock, vi } from 'vitest';

import { ITile } from '../../../../components/Catalog/Catalog.models';
import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { StepUpdateAction } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { EntityType } from '../../../../models/entities';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import {
  ACTION_ID_CANCEL,
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
  MetadataContext,
} from '../../../../providers';
import { IMetadataApi } from '../../../../providers/metadata.provider';
import { TestProvidersWrapper } from '../../../../stubs';
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

vi.mock('../ContextMenu/item-interaction-helper', () => ({
  findOnDeleteModalCustomizationRecursively: vi.fn(),
  processOnDeleteAddonRecursively: vi.fn(),
}));

describe('useReplaceStep', () => {
  let camelResource: CamelRouteResource;
  let mockVizNode: IVisualizationNode;
  let updateEntitiesFromCamelResourceSpy: Mock;

  const mockCatalogModalContext = {
    setIsModalOpen: vi.fn(),
    getNewComponent: vi.fn(),
    checkCompatibility: vi.fn(),
  };

  const mockMetadataContext: IMetadataApi = {
    onStepUpdated: vi.fn(),
    getMetadata: vi.fn(),
    setMetadata: vi.fn(),
    getResourceContent: vi.fn(),
    isResourceExist: vi.fn(),
    saveResourceContent: vi.fn(),
    deleteResource: vi.fn(),
    askUserForFileSelection: vi.fn(),
    getSuggestions: vi.fn(),
    shouldSaveSchema: false,
  };

  const mockActionConfirmationModalContext = {
    actionConfirmation: vi.fn(),
  };

  const mockNodeInteractionAddonContext: INodeInteractionAddonContext = {
    registerInteractionAddon: vi.fn(),
    getRegisteredInteractionAddons: vi.fn().mockReturnValue([]),
  };

  const mockDefinedComponent = {
    type: 'log',
    name: 'log-component',
    definition: { id: 'test-log', message: 'hello world' },
  };

  const mockCompatibleComponents = (item: ITile) => ['log', 'to'].includes(item.type);

  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(() => {
    camelResource = new CamelRouteResource();
    camelResource.initialize();
    mockVizNode = createVisualizationNode('test-step', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.addBaseEntityStep = vi.fn();
    mockVizNode.getChildren = vi.fn().mockReturnValue([]);
    vi.spyOn(camelResource, 'getCompatibleComponents').mockReturnValue(mockCompatibleComponents);
    (findOnDeleteModalCustomizationRecursively as Mock).mockReturnValue([]);
    (processOnDeleteAddonRecursively as Mock).mockImplementation(() => {});

    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = TestProvidersWrapper({ camelResource });
    updateEntitiesFromCamelResourceSpy = updateSpy;

    wrapper = ({ children }) => (
      <Provider>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={mockMetadataContext}>
            <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
              <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
                {children}
              </NodeInteractionAddonContext.Provider>
            </ActionConfirmationModalContext.Provider>
          </MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </Provider>
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
    const { Provider } = TestProvidersWrapper({ camelResource, entitiesContextValue: null });
    const nullEntitiesWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <Provider>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={mockMetadataContext}>
            <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
              <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
                {children}
              </NodeInteractionAddonContext.Provider>
            </ActionConfirmationModalContext.Provider>
          </MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </Provider>
    );

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper: nullEntitiesWrapper });

    await result.current.onReplaceNode();

    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
  });

  it('should replace step without confirmation when no children', async () => {
    mockVizNode.getChildren = vi.fn().mockReturnValue([]);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(AddStepMode.ReplaceStep, mockVizNode.data);
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.ReplaceStep);
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).toHaveBeenCalledWith(
      StepUpdateAction.Replace,
      mockDefinedComponent.type,
      mockDefinedComponent.name,
    );
  });

  it('should replace step without confirmation when only placeholder child', async () => {
    const placeholderChild = createVisualizationNode('placeholder', {
      name: EntityType.Route,
      isPlaceholder: true,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.getChildren = vi.fn().mockReturnValue([placeholderChild]);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).not.toHaveBeenCalled();
    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.ReplaceStep);
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
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
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
  });

  it('should not replace step when modal is cancelled', async () => {
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

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockActionConfirmationModalContext.actionConfirmation).toHaveBeenCalled();
    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
  });

  it('should not replace step when modal returns undefined', async () => {
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
    expect(updateEntitiesFromCamelResourceSpy).not.toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).not.toHaveBeenCalled();
  });

  it('should return early when catalog modal returns undefined', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper });

    await result.current.onReplaceNode();

    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
    expect(updateEntitiesFromCamelResourceSpy).not.toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).not.toHaveBeenCalled();
  });

  it('should handle modal customizations from interaction addons', async () => {
    const mockModalCustomization = {
      additionalText: 'Custom replace warning',
      buttonOptions: { confirm: 'Replace Now', cancel: 'Keep Current' },
    };
    const nonPlaceholderChild = createVisualizationNode('child', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.getChildren = vi.fn().mockReturnValue([nonPlaceholderChild]);
    (findOnDeleteModalCustomizationRecursively as Mock).mockReturnValue([mockModalCustomization]);
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

    const callback = (findOnDeleteModalCustomizationRecursively as Mock).mock.calls[0][1];
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

    const { Provider, updateEntitiesFromCamelResourceSpy: localUpdateSpy } = TestProvidersWrapper({ camelResource });
    const noMetadataWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <Provider>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={undefined}>
            <ActionConfirmationModalContext.Provider value={mockActionConfirmationModalContext}>
              <NodeInteractionAddonContext.Provider value={mockNodeInteractionAddonContext}>
                {children}
              </NodeInteractionAddonContext.Provider>
            </ActionConfirmationModalContext.Provider>
          </MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </Provider>
    );

    const { result } = renderHook(() => useReplaceStep(mockVizNode), { wrapper: noMetadataWrapper });

    await result.current.onReplaceNode();

    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.ReplaceStep);
    expect(localUpdateSpy).toHaveBeenCalled();
  });
});
