import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { ITile } from '../../../../components/Catalog/Catalog.models';
import { StepUpdateAction } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { AddStepMode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { IMetadataApi, MetadataContext } from '../../../../providers/metadata.provider';
import { useAddStep } from './add-step.hook';

describe('useAddStep', () => {
  const camelResource = new CamelRouteResource();
  const getCompatibleComponentsSpy = jest.spyOn(camelResource, 'getCompatibleComponents');

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

  const mockDefinedComponent = {
    type: 'log',
    name: 'log-component',
    definition: { id: 'test-log', message: 'hello world' },
  };

  const mockCompatibleComponents = (item: ITile) => ['log', 'to'].includes(item.type);

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CatalogModalContext.Provider value={mockCatalogModalContext}>
        <MetadataContext.Provider value={mockMetadataContext}>{children}</MetadataContext.Provider>
      </CatalogModalContext.Provider>
    </EntitiesContext.Provider>
  );

  it('should return onAddStep function', () => {
    const vizNode = createVisualizationNode('test', {});
    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    expect(result.current.onAddStep).toBeDefined();
    expect(typeof result.current.onAddStep).toBe('function');
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const vizNode = createVisualizationNode('test', {});
    const { result, rerender } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should use AppendStep mode as default when mode is not provided', () => {
    const vizNode = createVisualizationNode('test', {});
    const { result } = renderHook(() => useAddStep(vizNode), { wrapper });

    expect(result.current.onAddStep).toBeDefined();
  });

  it('should return early when entitiesContext is null', async () => {
    const vizNode = createVisualizationNode('test', {});
    const nullEntitiesWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <EntitiesContext.Provider value={null}>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={mockMetadataContext}>{children}</MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </EntitiesContext.Provider>
    );

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), {
      wrapper: nullEntitiesWrapper,
    });

    await result.current.onAddStep();

    expect(getCompatibleComponentsSpy).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
  });

  it('should get compatible components and open catalog modal', async () => {
    const vizNode = createVisualizationNode('test', {});
    const addBaseEntityStepSpy = jest.spyOn(vizNode, 'addBaseEntityStep');

    getCompatibleComponentsSpy.mockReturnValue(mockCompatibleComponents);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    await result.current.onAddStep();

    expect(getCompatibleComponentsSpy).toHaveBeenCalledWith(AddStepMode.AppendStep, vizNode.data);
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(addBaseEntityStepSpy).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.AppendStep);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).toHaveBeenCalledWith(
      StepUpdateAction.Add,
      mockDefinedComponent.type,
      mockDefinedComponent.name,
    );
  });

  it('should work with PrependStep mode', async () => {
    const vizNode = createVisualizationNode('test', {});
    const addBaseEntityStepSpy = jest.spyOn(vizNode, 'addBaseEntityStep');

    getCompatibleComponentsSpy.mockReturnValue(mockCompatibleComponents);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.PrependStep), { wrapper });

    await result.current.onAddStep();

    expect(getCompatibleComponentsSpy).toHaveBeenCalledWith(AddStepMode.PrependStep, vizNode.data);
    expect(addBaseEntityStepSpy).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.PrependStep);
  });

  it('should return early when catalog modal returns no component', async () => {
    const vizNode = createVisualizationNode('test', {});
    const addBaseEntityStepSpy = jest.spyOn(vizNode, 'addBaseEntityStep');

    getCompatibleComponentsSpy.mockReturnValue(mockCompatibleComponents);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(null);

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    await result.current.onAddStep();

    expect(getCompatibleComponentsSpy).toHaveBeenCalledWith(AddStepMode.AppendStep, vizNode.data);
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(addBaseEntityStepSpy).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).not.toHaveBeenCalled();
  });

  it('should return early when catalog modal returns undefined', async () => {
    const vizNode = createVisualizationNode('test', {});
    const addBaseEntityStepSpy = jest.spyOn(vizNode, 'addBaseEntityStep');

    getCompatibleComponentsSpy.mockReturnValue(mockCompatibleComponents);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), { wrapper });

    await result.current.onAddStep();

    expect(addBaseEntityStepSpy).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
    expect(mockMetadataContext.onStepUpdated).not.toHaveBeenCalled();
  });

  it('should handle missing metadata context gracefully', async () => {
    const vizNode = createVisualizationNode('test', {});
    const addBaseEntityStepSpy = jest.spyOn(vizNode, 'addBaseEntityStep');

    getCompatibleComponentsSpy.mockReturnValue(mockCompatibleComponents);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const noMetadataWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <EntitiesContext.Provider value={mockEntitiesContext}>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>
          <MetadataContext.Provider value={undefined}>{children}</MetadataContext.Provider>
        </CatalogModalContext.Provider>
      </EntitiesContext.Provider>
    );

    const { result } = renderHook(() => useAddStep(vizNode, AddStepMode.AppendStep), {
      wrapper: noMetadataWrapper,
    });

    await result.current.onAddStep();

    expect(addBaseEntityStepSpy).toHaveBeenCalledWith(mockDefinedComponent, AddStepMode.AppendStep);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });
});
