import { setValue } from '@kaoto/forms';
import { renderHook, waitFor } from '@testing-library/react';
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
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn();
    mockVizNode.getNodeDefinition = vi.fn().mockReturnValue({});
    mockVizNode.updateModel = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
  );

  it('should return onToggleDisableNode function and isDisabled status', async () => {
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue({ disabled: false });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(false);
    });
    expect(result.current.onToggleDisableNode).toBeDefined();
    expect(typeof result.current.onToggleDisableNode).toBe('function');
    expect(typeof result.current.isDisabled).toBe('boolean');
  });

  it('should return isDisabled as false when step is not disabled', async () => {
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue({ disabled: false });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(false);
    });
  });

  it('should return isDisabled as true when step is disabled', async () => {
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue({ disabled: true });

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(true);
    });
  });

  it('should return isDisabled as false when disabled property is undefined', async () => {
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue({});

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(false);
    });
  });

  it('should return isDisabled as false when definition is undefined', async () => {
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(false);
    });
  });

  it('should enable step when currently disabled', async () => {
    const mockDefinition = { disabled: true, id: 'test-step' };
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue(mockDefinition);

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(true);
    });
    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', false);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should disable step when currently enabled', async () => {
    const mockDefinition = { disabled: false, id: 'test-step' };
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue(mockDefinition);

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(mockVizNode.getParsedDefinition).toHaveBeenCalledTimes(1);
    });
    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should work with empty definition object', async () => {
    const mockDefinition = {};
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue(mockDefinition);

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(false);
    });
    result.current.onToggleDisableNode();

    expect(setValue).toHaveBeenCalledWith(mockDefinition, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should use node definition as fallback when parsed definition is undefined', async () => {
    const nodeDefinition = { id: 'test-step', uri: 'direct:start' };
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue(undefined);
    mockVizNode.getNodeDefinition = vi.fn().mockReturnValue(nodeDefinition);

    const { result } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(result.current.isDisabled).toBe(false);
    });
    result.current.onToggleDisableNode();

    expect(mockVizNode.getNodeDefinition).toHaveBeenCalled();
    expect(setValue).toHaveBeenCalledWith(nodeDefinition, 'disabled', true);
    expect(mockVizNode.updateModel).toHaveBeenCalledWith(nodeDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should maintain stable reference when dependencies do not change', async () => {
    (mockVizNode as IVisualizationNode).getParsedDefinition = vi.fn().mockResolvedValue({ disabled: false });

    const { result, rerender } = renderHook(() => useDisableStep(mockVizNode), { wrapper });

    await waitFor(() => {
      expect(mockVizNode.getParsedDefinition).toHaveBeenCalledTimes(1);
    });
    const firstCallback = result.current.onToggleDisableNode;
    const firstIsDisabled = result.current.isDisabled;
    rerender();

    // useMemo does not guarantee object identity across renders; assert that
    // the callback reference and primitive value are stable instead.
    expect(result.current.onToggleDisableNode).toBe(firstCallback);
    expect(result.current.isDisabled).toBe(firstIsDisabled);
  });
});
