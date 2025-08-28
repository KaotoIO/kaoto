import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { ITile } from '../../../../components/Catalog/Catalog.models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { CatalogModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { useInsertStep } from './insert-step.hook';

describe('useInsertStep', () => {
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

  const mockDefinedComponent = {
    type: 'log',
    name: 'log-component',
    definition: { id: 'test-log', message: 'hello world' },
  };

  const mockCompatibleComponents = (item: ITile) => ['log', 'to'].includes(item.type);

  beforeEach(() => {
    mockVizNode = createVisualizationNode('test', {});
    mockVizNode.addBaseEntityStep = jest.fn();
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({ definition: {} });
    jest.spyOn(camelResource, 'getCompatibleComponents').mockReturnValue(mockCompatibleComponents);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>
      <CatalogModalContext.Provider value={mockCatalogModalContext}>{children}</CatalogModalContext.Provider>
    </EntitiesContext.Provider>
  );

  it('should return onInsertStep function', () => {
    const { result } = renderHook(() => useInsertStep(mockVizNode), { wrapper });

    expect(result.current.onInsertStep).toBeDefined();
    expect(typeof result.current.onInsertStep).toBe('function');
  });

  it('should use InsertChildStep as default mode when mode is not provided', () => {
    const { result } = renderHook(() => useInsertStep(mockVizNode), { wrapper });

    expect(result.current.onInsertStep).toBeDefined();
  });

  it('should accept InsertSpecialChildStep mode', () => {
    const { result } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertSpecialChildStep), { wrapper });

    expect(result.current.onInsertStep).toBeDefined();
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertChildStep), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should return early when vizNode is null', async () => {
    const { result } = renderHook(() => useInsertStep(null as unknown as IVisualizationNode), { wrapper });

    await result.current.onInsertStep();

    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
  });

  it('should return early when entitiesContext is null', async () => {
    const nullEntitiesWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <EntitiesContext.Provider value={null}>
        <CatalogModalContext.Provider value={mockCatalogModalContext}>{children}</CatalogModalContext.Provider>
      </EntitiesContext.Provider>
    );

    const { result } = renderHook(() => useInsertStep(mockVizNode), { wrapper: nullEntitiesWrapper });

    await result.current.onInsertStep();

    expect(camelResource.getCompatibleComponents).not.toHaveBeenCalled();
    expect(mockCatalogModalContext.getNewComponent).not.toHaveBeenCalled();
  });

  it('should get compatible components and insert step with InsertChildStep mode', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertChildStep), { wrapper });

    await result.current.onInsertStep();

    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(
      AddStepMode.InsertChildStep,
      mockVizNode.data,
      {},
    );
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(
      mockDefinedComponent,
      AddStepMode.InsertChildStep,
      'steps',
    );
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should get compatible components and insert step with InsertSpecialChildStep mode', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertSpecialChildStep), { wrapper });

    await result.current.onInsertStep();

    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(
      AddStepMode.InsertSpecialChildStep,
      mockVizNode.data,
      {},
    );
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(mockVizNode.addBaseEntityStep).toHaveBeenCalledWith(
      mockDefinedComponent,
      AddStepMode.InsertSpecialChildStep,
      undefined,
    );
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should return early when catalog modal returns no component', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(null);

    const { result } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertChildStep), { wrapper });

    await result.current.onInsertStep();

    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(
      AddStepMode.InsertChildStep,
      mockVizNode.data,
      {},
    );
    expect(mockCatalogModalContext.getNewComponent).toHaveBeenCalledWith(mockCompatibleComponents);
    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
  });

  it('should return early when catalog modal returns undefined', async () => {
    mockCatalogModalContext.getNewComponent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertChildStep), { wrapper });

    await result.current.onInsertStep();

    expect(mockVizNode.addBaseEntityStep).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
  });

  it('should pass component definition from component schema', async () => {
    const mockComponentDefinition = { id: 'existing-component', type: 'existing' };
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({ definition: mockComponentDefinition });
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertChildStep), { wrapper });

    await result.current.onInsertStep();

    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(
      AddStepMode.InsertChildStep,
      mockVizNode.data,
      mockComponentDefinition,
    );
  });

  it('should handle undefined component schema', async () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue(undefined);
    mockCatalogModalContext.getNewComponent.mockResolvedValue(mockDefinedComponent);

    const { result } = renderHook(() => useInsertStep(mockVizNode, AddStepMode.InsertChildStep), { wrapper });

    await result.current.onInsertStep();

    expect(camelResource.getCompatibleComponents).toHaveBeenCalledWith(
      AddStepMode.InsertChildStep,
      mockVizNode.data,
      undefined,
    );
  });

  it('should update references when vizNode changes', () => {
    const { result, rerender } = renderHook(({ vizNode, mode }) => useInsertStep(vizNode, mode), {
      initialProps: { vizNode: mockVizNode, mode: AddStepMode.InsertChildStep } as const,
      wrapper,
    });

    const firstResult = result.current;

    const newMockVizNode = createVisualizationNode('new-test', {});
    newMockVizNode.addBaseEntityStep = jest.fn();
    newMockVizNode.getComponentSchema = jest.fn().mockReturnValue({ definition: {} });

    rerender({ vizNode: newMockVizNode, mode: AddStepMode.InsertChildStep });

    expect(result.current).not.toBe(firstResult);
  });

  it('should update references when mode changes', () => {
    const initialProps: { vizNode: Parameters<typeof useInsertStep>[0]; mode: Parameters<typeof useInsertStep>[1] } = {
      vizNode: mockVizNode,
      mode: AddStepMode.InsertChildStep,
    };

    const { result, rerender } = renderHook(({ vizNode, mode }) => useInsertStep(vizNode, mode), {
      initialProps,
      wrapper,
    });

    const firstResult = result.current;

    rerender({ vizNode: mockVizNode, mode: AddStepMode.InsertSpecialChildStep });

    expect(result.current).not.toBe(firstResult);
  });
});
