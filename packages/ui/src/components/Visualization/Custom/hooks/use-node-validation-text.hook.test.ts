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
  it('should return undefined before the async validation resolves', async () => {
    const node = createNode('Some warning');
    const { result } = renderHook(() => useNodeValidationText(node as unknown as IVisualizationNode));

    expect(result.current).toBeUndefined();

    // Wait for the async validation to settle so resolution doesn't leak into subsequent tests
    await waitFor(() => {
      expect(result.current).toBe('Some warning');
    });
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

  it('hides a previous warning immediately while an edited node is being validated', async () => {
    const node = createNode('Previous warning');
    const { result, rerender } = renderHook(() => useNodeValidationText(node as unknown as IVisualizationNode));
    await waitFor(() => {
      expect(result.current).toBe('Previous warning');
    });

    node.lastUpdate = 1;
    node.getNodeValidationText.mockReturnValue(new Promise(() => {}));
    rerender();

    expect(result.current).toBeUndefined();
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
