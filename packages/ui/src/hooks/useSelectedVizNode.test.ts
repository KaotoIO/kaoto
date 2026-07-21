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
import { act, renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';

import { IVisualizationNode } from '../models/visualization/base-visual-entity';
import { useSelectedVizNode } from './useSelectedVizNode';

vi.mock('@patternfly/react-topology', () => ({
  useVisualizationController: vi.fn(),
}));

const mockVizNode = { id: 'timer-1' } as unknown as IVisualizationNode;

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
    await act(async () => {});
    expect(result.current).toBe(mockVizNode);
  });

  it('returns undefined when controller returns no node for the given id', async () => {
    (useVisualizationController as Mock).mockReturnValue(makeController(undefined));
    const { result } = renderHook(() => useSelectedVizNode(['scope|unknown']));
    await act(async () => {});
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the node has no vizNode in its data', async () => {
    const controller = { getNodeById: vi.fn(() => ({ getData: () => ({}) })) };
    (useVisualizationController as Mock).mockReturnValue(controller);
    const { result } = renderHook(() => useSelectedVizNode(['scope|timer-1']));
    await act(async () => {});
    expect(result.current).toBeUndefined();
  });

  it('updates when selectedIds changes', async () => {
    let ids = ['scope|timer-1'];
    const { result, rerender } = renderHook(() => useSelectedVizNode(ids));
    await act(async () => {});
    expect(result.current).toBe(mockVizNode);

    ids = [];
    rerender();
    await act(async () => {});
    expect(result.current).toBeUndefined();
  });
});
