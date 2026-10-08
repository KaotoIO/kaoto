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
import { Model, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { useSelectedNodePanIntoView } from './useSelectedNodePanIntoView';

/** Creates a real topology controller holding the given nodes, spying on the graph's panIntoView */
function makeController(nodeFound = true) {
  const nodes: Model['nodes'] = nodeFound ? [{ id: 'scope|timer-1', type: 'node' }] : [];
  const controller = new Visualization();
  controller.fromModel({ graph: { id: 'graph', type: 'graph' }, nodes });
  const panIntoView = vi.spyOn(controller.getGraph(), 'panIntoView').mockImplementation(() => {});

  return { panIntoView, controller };
}

function renderPanIntoView(controller: Visualization, selectedIds: () => string[]) {
  const wrapper = ({ children }: PropsWithChildren) => createElement(VisualizationProvider, { controller }, children);

  return renderHook(
    () => {
      useSelectedNodePanIntoView(selectedIds());
    },
    { wrapper },
  );
}

describe('useSelectedNodePanIntoView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not call panIntoView when selectedIds is empty', async () => {
    const { panIntoView, controller } = makeController();

    renderPanIntoView(controller, () => []);
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });

  it('does not call panIntoView when selectedIds has more than one element', async () => {
    const { panIntoView, controller } = makeController();

    renderPanIntoView(controller, () => ['scope|timer-1', 'scope|timer-2']);
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });

  it('does not call panIntoView when node is not found', async () => {
    const { panIntoView, controller } = makeController(false);

    renderPanIntoView(controller, () => ['scope|unknown']);
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });

  it('calls panIntoView with correct options after the timeout fires', async () => {
    const { panIntoView, controller } = makeController(true);

    renderPanIntoView(controller, () => ['scope|timer-1']);
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).toHaveBeenCalledWith(controller.getNodeById('scope|timer-1'), {
      offset: 150,
      minimumVisible: 100,
    });
    expect(panIntoView).toHaveBeenCalledWith(expect.objectContaining({ id: 'scope|timer-1' }), {
      offset: 150,
      minimumVisible: 100,
    });
  });

  it('cancels the timeout when selectedIds changes before it fires', async () => {
    const { panIntoView, controller } = makeController(true);

    let ids = ['scope|timer-1'];
    const { rerender } = renderPanIntoView(controller, () => ids);

    // Change selection before 500ms elapses
    ids = [];
    rerender();
    await act(async () => {
      vi.runAllTimers();
    });

    expect(panIntoView).not.toHaveBeenCalled();
  });
});
