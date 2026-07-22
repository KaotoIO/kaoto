import { renderHook, waitFor } from '@testing-library/react';

import { IVisualizationNode } from '../../../../models';
import { useNodeValidationText } from './use-node-validation-text.hook';

interface FakeNode {
  lastUpdate: number;
  getNodeValidationText: ReturnType<typeof vi.fn>;
}

const createNode = (text: string | undefined): FakeNode => ({
  lastUpdate: 0,
  getNodeValidationText: vi.fn().mockResolvedValue(text),
});

describe('useNodeValidationText', () => {
  it('should return undefined before the async validation resolves', () => {
    const node = createNode('Some warning');
    const { result } = renderHook(() => useNodeValidationText(node as unknown as IVisualizationNode));

    expect(result.current).toBeUndefined();
  });

  it('should return the resolved validation text', async () => {
    const node = createNode('Some warning');
    const { result } = renderHook(() => useNodeValidationText(node as unknown as IVisualizationNode));

    await waitFor(() => {
      expect(result.current).toBe('Some warning');
    });
  });

  it('should re-resolve when the node is edited in place (lastUpdate changes)', async () => {
    const node = createNode(undefined);
    const { result, rerender } = renderHook(() => useNodeValidationText(node as unknown as IVisualizationNode));

    await waitFor(() => {
      expect(node.getNodeValidationText).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toBeUndefined();

    // Simulate an in-place edit: same node reference, new validation result, bumped lastUpdate.
    node.getNodeValidationText.mockResolvedValue('Now invalid');
    node.lastUpdate = 1;
    rerender();

    await waitFor(() => {
      expect(result.current).toBe('Now invalid');
    });
    expect(node.getNodeValidationText).toHaveBeenCalledTimes(2);
  });

  it('should return undefined when no node is provided', () => {
    const { result } = renderHook(() => useNodeValidationText());

    expect(result.current).toBeUndefined();
  });

  it('should log and not throw when validation rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const node = createNode(undefined);
    node.getNodeValidationText.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useNodeValidationText(node as unknown as IVisualizationNode));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get node validation text:', expect.any(Error));
    });
    expect(result.current).toBeUndefined();

    consoleErrorSpy.mockRestore();
  });
});
