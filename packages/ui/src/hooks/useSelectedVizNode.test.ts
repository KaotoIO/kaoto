/*
    Copyright (C) 2026 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { useVisualizationController } from '@patternfly/react-topology';
import { renderHook, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';

import { IVisualizationNode } from '../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../models/visualization/visualization-node';
import { useSelectedVizNode } from './useSelectedVizNode';

vi.mock('@patternfly/react-topology', () => ({
  useVisualizationController: vi.fn(),
}));

const mockVizNode = createVisualizationNode('timer-1', {} as never);

function makeController(vizNode?: IVisualizationNode) {
  return {
    getNodeById: vi.fn((id: string) => {
      if (id === 'scope|timer-1' && vizNode) {
        return { getData: () => ({ vizNode }) };
      }
      return undefined;
    }),
  };
}

describe('useSelectedVizNode', () => {
  beforeEach(() => {
    /* Re-established per test so a test that overrides it cannot leak into the next one */
    mockVizNode.fetchSchema = vi.fn().mockResolvedValue(undefined);
    (useVisualizationController as Mock).mockReturnValue(makeController(mockVizNode));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns undefined when selectedIds is empty', () => {
    const { result } = renderHook(() => useSelectedVizNode([]));
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when selectedIds has more than one element', () => {
    const { result } = renderHook(() => useSelectedVizNode(['scope|timer-1', 'scope|timer-2']));
    expect(result.current).toBeUndefined();
  });

  it('returns the vizNode when exactly one id resolves to a node with vizNode', async () => {
    const { result } = renderHook(() => useSelectedVizNode(['scope|timer-1']));
    await waitFor(() => {
      expect(result.current).toBe(mockVizNode);
    });
  });

  it('returns undefined when controller returns no node for the given id', async () => {
    (useVisualizationController as Mock).mockReturnValue(makeController(undefined));
    const { result } = renderHook(() => useSelectedVizNode(['scope|unknown']));
    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });

  it('returns undefined when the node has no vizNode in its data', async () => {
    const controller = { getNodeById: vi.fn(() => ({ getData: () => ({}) })) };
    (useVisualizationController as Mock).mockReturnValue(controller);
    const { result } = renderHook(() => useSelectedVizNode(['scope|timer-1']));
    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });

  it('updates when selectedIds changes', async () => {
    let ids = ['scope|timer-1'];
    const { result, rerender } = renderHook(() => useSelectedVizNode(ids));
    await waitFor(() => {
      expect(result.current).toBe(mockVizNode);
    });

    ids = [];
    rerender();
    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });

  it('does not select the vizNode while fetchSchema is pending', async () => {
    let resolveSchema!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveSchema = resolve;
    });
    mockVizNode.fetchSchema = vi.fn().mockReturnValue(pending);

    const { result } = renderHook(() => useSelectedVizNode(['scope|timer-1']));

    // Should be undefined while pending
    expect(result.current).toBeUndefined();
    expect(mockVizNode.fetchSchema).toHaveBeenCalled();

    // Resolve the promise
    resolveSchema();

    // Should now have the vizNode
    await waitFor(() => {
      expect(result.current).toBe(mockVizNode);
    });
  });

  it('keeps the selection cleared when fetchSchema rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('Schema fetch failed');
    mockVizNode.fetchSchema = vi.fn().mockRejectedValue(testError);

    const { result } = renderHook(() => useSelectedVizNode(['scope|timer-1']));

    // Wait for the rejection to be processed
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch schema for the selected node:', testError);
    });

    // Selection should remain undefined
    expect(result.current).toBeUndefined();
  });

  it('does not log when fetchSchema rejects after the request was cancelled', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rejectSchema!: (error: Error) => void;
    mockVizNode.fetchSchema = vi.fn().mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectSchema = reject;
      }),
    );

    const { unmount } = renderHook(() => useSelectedVizNode(['scope|timer-1']));
    unmount();
    rejectSchema(new Error('Schema fetch failed'));

    /* Let the rejection settle before asserting that nothing was logged for it */
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
