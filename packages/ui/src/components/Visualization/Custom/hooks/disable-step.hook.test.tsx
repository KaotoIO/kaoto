import { setValue } from '@kaoto/forms';
import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { useDisableStep } from './disable-step.hook';

jest.mock('@kaoto/forms', () => ({
  setValue: jest.fn(),
}));

describe('useDisableStep', () => {
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

  beforeEach(() => {
    mockVizNode = createVisualizationNode('test-step', {});
    mockVizNode.getComponentSchema = jest.fn();
    mockVizNode.updateModel = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
  );

  it('should return onToggleDisableNode function and isDisabled status', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: false },
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.onToggleDisableNode).toBeDefined();
    expect(result.current.isDisabled).toBeDefined();
    expect(typeof result.current.onToggleDisableNode).toBe('function');
    expect(typeof result.current.isDisabled).toBe('boolean');
  });

  it('should return isDisabled as false when step is not disabled', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: false },
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
  });

  it('should return isDisabled as true when step is disabled', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: true },
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(true);
  });

  it('should return isDisabled as false when disabled property is undefined', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: {},
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
  });

  it('should return isDisabled as false when definition is undefined', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: undefined,
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
  });

  it('should return isDisabled as false when component schema is undefined', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue(undefined);

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
  });

  it('should enable step when currently disabled', () => {
    const mockDefinition = { disabled: true, id: 'test-step' };
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: mockDefinition,
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', false);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should disable step when currently enabled', () => {
    const mockDefinition = { disabled: false, id: 'test-step' };
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: mockDefinition,
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should work with empty definition object', () => {
    const mockDefinition = {};
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: mockDefinition,
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should create new definition object when undefined', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: undefined,
    });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith({}, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith({});
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should maintain stable reference when dependencies do not change', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: false },
    });

    const { result, rerender } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should update references when disabled status changes', () => {
    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: false },
    });

    const { result, rerender } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    const firstResult = result.current;

    mockVizNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: true },
    });

    rerender();

    expect(result.current).not.toBe(firstResult);
    expect(result.current.isDisabled).toBe(true);
  });
});
