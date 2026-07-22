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
import { action, useVisualizationController } from '@patternfly/react-topology';
import { act, renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';

import { useSelectedNodePanIntoView } from './useSelectedNodePanIntoView';

vi.mock('@patternfly/react-topology', () => ({
  useVisualizationController: vi.fn(),
  action: vi.fn((fn) => fn),
}));

function makeController(nodeFound = true) {
  const panIntoView = vi.fn();
  const graphNode = nodeFound ? { id: 'scope|timer-1' } : undefined;
  return {
    panIntoView,
    controller: {
      getNodeById: vi.fn(() => graphNode),
      getGraph: vi.fn(() => ({ panIntoView })),
    },
  };
}

describe('useSelectedNodePanIntoView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (action as unknown as Mock).mockImplementation((fn: () => void) => fn);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not call panIntoView when selectedIds is empty', async () => {
    const { panIntoView, controller } = makeController();
    (useVisualizationController as Mock).mockReturnValue(controller);

    renderHook(() => {
      useSelectedNodePanIntoView([]);
    });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });

  it('does not call panIntoView when selectedIds has more than one element', async () => {
    const { panIntoView, controller } = makeController();
    (useVisualizationController as Mock).mockReturnValue(controller);

    renderHook(() => {
      useSelectedNodePanIntoView(['scope|timer-1', 'scope|timer-2']);
    });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });

  it('does not call panIntoView when node is not found', async () => {
    const { panIntoView, controller } = makeController(false);
    (useVisualizationController as Mock).mockReturnValue(controller);

    renderHook(() => {
      useSelectedNodePanIntoView(['scope|unknown']);
    });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });

  it('calls panIntoView with correct options after the timeout fires', async () => {
    const { panIntoView, controller } = makeController(true);
    (useVisualizationController as Mock).mockReturnValue(controller);

    renderHook(() => {
      useSelectedNodePanIntoView(['scope|timer-1']);
    });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).toHaveBeenCalledWith(expect.objectContaining({ id: 'scope|timer-1' }), {
      offset: 150,
      minimumVisible: 100,
    });
  });

  it('cancels the timeout when selectedIds changes before it fires', async () => {
    const { panIntoView, controller } = makeController(true);
    (useVisualizationController as Mock).mockReturnValue(controller);

    let ids = ['scope|timer-1'];
    const { rerender } = renderHook(() => {
      useSelectedNodePanIntoView(ids);
    });

    // Change selection before 500ms elapses
    ids = [];
    rerender();
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });
});
