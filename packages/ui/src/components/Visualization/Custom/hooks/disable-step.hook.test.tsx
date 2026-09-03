import { setValue } from '@kaoto/forms';
import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { createMockEntitiesContext } from '../../../../stubs/create-mock-entities-context';
import { useDisableStep } from './disable-step.hook';

vi.mock('@kaoto/forms', () => ({
  setValue: vi.fn(),
}));

describe('useDisableStep', () => {
  const camelResource = new CamelRouteResource();
  let mockVizNode: IVisualizationNode;
  let mockEntitiesContext: EntitiesContextResult;

  beforeAll(async () => {
    mockEntitiesContext = await createMockEntitiesContext(camelResource);
  });

  beforeEach(() => {
    mockVizNode = createVisualizationNode('test-step', {
      name: 'from',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    });
    mockVizNode.updateModel = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
  );

  it('should return onToggleDisableNode function and isDisabled status', () => {
    mockVizNode.data.definition = { disabled: false };

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
    expect(result.current.onToggleDisableNode).toBeDefined();
    expect(typeof result.current.onToggleDisableNode).toBe('function');
    expect(typeof result.current.isDisabled).toBe('boolean');
  });

  it('should return isDisabled as false when step is not disabled', () => {
    mockVizNode.data.definition = { disabled: false };

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
  });

  it('should return isDisabled as true when step is disabled', () => {
    mockVizNode.data.definition = { disabled: true };

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(true);
  });

  it('should return isDisabled as false when disabled property is undefined', () => {
    mockVizNode.data.definition = {};

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
  });

  it('should return isDisabled as false when definition is undefined', () => {
    mockVizNode.data.definition = undefined;

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
  });

  it('should enable step when currently disabled', () => {
    const mockDefinition = { disabled: true, id: 'test-step' };
    mockVizNode.data.definition = mockDefinition;

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(true);
    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', false);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should disable step when currently enabled', () => {
    const mockDefinition = { disabled: false, id: 'test-step' };
    mockVizNode.data.definition = mockDefinition;

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should work with empty definition object', () => {
    const mockDefinition = {};
    mockVizNode.data.definition = mockDefinition;

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should do nothing when data.definition is undefined', () => {
    mockVizNode.data.definition = undefined;

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    expect(result.current.isDisabled).toBe(false);
    result.current.onToggleDisableNode();

    expect(setValue).not.toHaveBeenCalled();
    expect(mockVizNode.updateModel).not.toHaveBeenCalled();
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).not.toHaveBeenCalled();
  });

  it('should maintain stable reference when dependencies do not change', () => {
    mockVizNode.data.definition = { disabled: false };

    const { result, rerender } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    const firstCallback = result.current.onToggleDisableNode;
    const firstIsDisabled = result.current.isDisabled;
    rerender();

    expect(result.current.onToggleDisableNode).toBe(firstCallback);
    expect(result.current.isDisabled).toBe(firstIsDisabled);
  });
});
