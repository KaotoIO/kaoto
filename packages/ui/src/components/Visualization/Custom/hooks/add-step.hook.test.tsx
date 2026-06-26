import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { ITile } from '../../../../components/Catalog/Catalog.models';
import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { StepUpdateAction } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { EntityType } from '../../../../models/entities';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { IMetadataApi, MetadataContext } from '../../../../providers/metadata.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { useAddStep } from './add-step.hook';

describe('useAddStep', () => {
  let camelResource: CamelRouteResource;
  let getCompatibleComponentsSpy: Mock;
  let updateEntitiesFromCamelResourceSpy: Mock;
  let vizNode!: IVisualizationNode;
  let addBaseEntityStepSpy!: ReturnType<typeof vi.spyOn>;

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

  const mockDefinedComponent = {
    type: 'log',
    name: 'log-component',
    definition: { id: 'test-log', message: 'hello world' },
  };

  const mockCompatibleComponents = (item: ITile) => ['log', 'to'].includes(item.type);

  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(async () => {
    camelResource = new CamelRouteResource();
    camelResource.initialize();
    getCompatibleComponentsSpy = vi.spyOn(camelResource, 'getCompatibleComponents');

    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = await TestProvidersWrapper({ camelResource });
    updateEntitiesFromCamelResourceSpy = updateSpy;

    wrapper = ({ children }) => (
      <Provider>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={mockMetadataContext}>{children}</MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </Provider>
    );

    vizNode = createVisualizationNode('test', {
      name: EntityType.Route,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    addBaseEntityStepSpy = vi.spyOn(vizNode, 'addBaseEntityStep');
    getCompatibleComponentsSpy.mockReturnValue(mockCompatibleComponents);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return onAddStep function', () => {
    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    expect(result.current.onAddStep).toBeDefined();
    expect(typeof result.current.onAddStep).toBe('function');
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should use AppendStep mode as default when mode is not provided', () => {
    const { result } = renderHook(() => useAddStep(vizNode), { wrapper });

    expect(result.current.onAddStep).toBeDefined();
  });

  it('should return early when entitiesContext is null', async () => {
    // Create a wrapper that provides null entities context
    const { Provider: NullEntitiesProvider } = await TestProvidersWrapper({
      camelResource,
      entitiesContextValue: null,
    });
    const nullEntitiesWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <NullEntitiesProvider>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={mockMetadataContext}>{children}</MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </NullEntitiesProvider>
    );

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), {
      wrapper: nullEntitiesWrapper,
    });

    await result.current.onAddStep();

    expect(getCompatibleComponentsSpy).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
  });

  it('should get compatible components and open catalog modal', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    await result.current.onAddStep();

    expect(getCompatibleComponentsSpy).toHaveBeenCalledWith(AddStepMode.AppendStep, vizNode.data);
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(addBaseEntityStepSpy).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.AppendStep);
    expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).toHaveBeenCalledWith(
      StepUpdateAction.Add,
      mockDefinedComponent.type,
      mockDefinedComponent.name,
    );
  });

  it('should work with PrependStep mode', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.PrependStep), { wrapper });

    await result.current.onAddStep();

    expect(getCompatibleComponentsSpy).toHaveBeenCalledWith(AddStepMode.PrependStep, vizNode.data);
    expect(addBaseEntityStepSpy).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.PrependStep);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('should return early when catalog modal returns %s', async (_label, returnValue) => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(returnValue);

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    await result.current.onAddStep();

    expect(addBaseEntityStepSpy).not.toHaveBeenCalled();
    expect(updateEntitiesFromCamelResourceSpy).not.toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).not.toHaveBeenCalled();
  });

  it('should handle missing metadata context gracefully', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { Provider, updateEntitiesFromCamelResourceSpy: localUpdateSpy } = await TestProvidersWrapper({
      camelResource,
    });
    const noMetadataWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <Provider>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={undefined}>{children}</MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </Provider>
    );

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), {
      wrapper: noMetadataWrapper,
    });

    await result.current.onAddStep();

    expect(addBaseEntityStepSpy).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.AppendStep);
    expect(localUpdateSpy).toHaveBeenCalled();
  });
});
