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
import { action, Dimensions, Point, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { useKeepCenterOnResize } from './useKeepCenterOnResize';

const NODE_ID = 'scope|timer-1';

/** Creates a real topology controller with a graph of the given initial size, at position (100, 50) */
function makeController(initialSize?: { width: number; height: number }) {
  const controller = new Visualization();
  controller.fromModel({ graph: { id: 'graph', type: 'graph' }, nodes: [{ id: NODE_ID, type: 'node' }] });
  const graph = controller.getGraph();
  const panIntoView = vi.spyOn(graph, 'panIntoView').mockImplementation(() => {});

  act(
    action(() => {
      graph.setPosition(new Point(100, 50));
      if (initialSize) {
        graph.setDimensions(new Dimensions(initialSize.width, initialSize.height));
      }
    }),
  );

  const resize = (width: number, height: number) => {
    act(
      action(() => {
        graph.setDimensions(new Dimensions(width, height));
      }),
    );
  };

  return { controller, graph, panIntoView, resize };
}

function renderKeepCenter(controller: Visualization, selectedIds: () => string[]) {
  const wrapper = ({ children }: PropsWithChildren) => createElement(VisualizationProvider, { controller }, children);

  return renderHook(
    () => {
      useKeepCenterOnResize(selectedIds());
    },
    { wrapper },
  );
}

describe('useKeepCenterOnResize', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('nothing selected', () => {
    it('does not move the graph when the hook is mounted', () => {
      const { controller, graph } = makeController({ width: 1000, height: 800 });

      renderKeepCenter(controller, () => []);

      expect(graph.getPosition()).toEqual(new Point(100, 50));
    });

    it('does not move the graph on the first measurement (from 0x0)', () => {
      const { controller, graph, resize } = makeController();
      renderKeepCenter(controller, () => []);

      resize(1000, 800);

      expect(graph.getPosition()).toEqual(new Point(100, 50));
    });

    it('shifts the graph by half of the width change when the container is narrowed', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => []);

      resize(600, 800);

      expect(graph.getPosition()).toEqual(new Point(-100, 50));
    });

    it('shifts the graph by half of the height change when the container height changes', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => []);

      resize(1000, 600);

      expect(graph.getPosition()).toEqual(new Point(100, -50));
    });

    it('restores the original position when the container goes back to its original size', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => []);

      resize(600, 700);
      resize(1000, 800);

      expect(graph.getPosition()).toEqual(new Point(100, 50));
    });

    it('does not change the scale', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      act(
        action(() => {
          graph.setScale(0.5);
        }),
      );
      renderKeepCenter(controller, () => []);

      resize(600, 800);

      expect(graph.getScale()).toBe(0.5);
    });

    it('ignores zero-sized measurements and uses the last non-zero size as reference', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => []);

      resize(0, 0);
      expect(graph.getPosition()).toEqual(new Point(100, 50));

      resize(600, 800);
      expect(graph.getPosition()).toEqual(new Point(-100, 50));
    });

    it('does not call panIntoView', () => {
      const { controller, panIntoView, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => []);

      resize(600, 800);

      expect(panIntoView).not.toHaveBeenCalled();
    });
  });

  describe('one node selected', () => {
    it('pans the selected node into view without shifting the graph', () => {
      const { controller, graph, panIntoView, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => [NODE_ID]);

      resize(600, 800);

      expect(graph.getPosition()).toEqual(new Point(100, 50));
      expect(panIntoView).toHaveBeenCalledWith(controller.getNodeById(NODE_ID), { offset: 150, minimumVisible: 100 });
    });

    it('does not pan when the selected node does not exist', () => {
      const { controller, panIntoView, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => ['scope|unknown']);

      resize(600, 800);

      expect(panIntoView).not.toHaveBeenCalled();
    });

    it('does not pan on the first measurement', () => {
      const { controller, panIntoView, resize } = makeController();
      renderKeepCenter(controller, () => [NODE_ID]);

      resize(1000, 800);

      expect(panIntoView).not.toHaveBeenCalled();
    });
  });

  describe('multiple nodes selected', () => {
    it('neither shifts nor pans the graph', () => {
      const { controller, graph, panIntoView, resize } = makeController({ width: 1000, height: 800 });
      renderKeepCenter(controller, () => [NODE_ID, 'scope|timer-2']);

      resize(600, 800);

      expect(graph.getPosition()).toEqual(new Point(100, 50));
      expect(panIntoView).not.toHaveBeenCalled();
    });
  });

  describe('sidebar toggling (selection changes together with or without the size)', () => {
    it('does not shift the graph when the sidebar opens (panIntoView handles it)', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      let ids: string[] = [];
      const { rerender } = renderKeepCenter(controller, () => ids);

      ids = [NODE_ID];
      rerender();
      resize(500, 800);

      expect(graph.getPosition()).toEqual(new Point(100, 50));
    });

    it('centers the graph when the sidebar closes (canvas widens)', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      let ids: string[] = [];
      const { rerender } = renderKeepCenter(controller, () => ids);

      ids = [NODE_ID];
      rerender();
      resize(500, 800);
      ids = [];
      rerender();
      resize(1000, 800);

      // After sidebar closes, the canvas widens by 500px.
      // Centering shifts the graph right by half: 100 + (1000 - 500) / 2 = 350.
      expect(graph.getPosition()).toEqual(new Point(350, 50));
    });

    it('centers the graph on further resizes after the sidebar is closed', () => {
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      let ids: string[] = [];
      const { rerender } = renderKeepCenter(controller, () => ids);

      ids = [NODE_ID];
      rerender();
      resize(500, 800);
      ids = [];
      rerender();
      resize(1000, 800); // sidebar closes → center: 100 + 250 = 350
      resize(600, 800); // external resize → center: 350 + (600 - 1000) / 2 = 350 - 200 = 150

      expect(graph.getPosition()).toEqual(new Point(150, 50));
    });

    it('centers after an external resize when the sidebar was open in overlay mode (no resize on sidebar toggle)', () => {
      // Narrow viewport: sidebar opens/closes as an overlay, not pushing the canvas.
      // Sequence: select (overlay, no resize) → external resize → deselect (no resize) → external resize.
      // The final external resize should center the graph.
      const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
      let ids: string[] = [];
      const { rerender } = renderKeepCenter(controller, () => ids);

      ids = [NODE_ID]; // sidebar opens as overlay — canvas size unchanged
      rerender();
      resize(500, 800); // external resize while selected → panIntoView (position unchanged, mocked)
      ids = []; // sidebar closes as overlay — canvas size unchanged
      rerender();
      resize(800, 800); // external resize after deselect → should center

      // Centering: 100 + (800 - 500) / 2 = 100 + 150 = 250
      expect(graph.getPosition()).toEqual(new Point(250, 50));
    });
  });

  it('stops reacting to size changes after unmount', () => {
    const { controller, graph, resize } = makeController({ width: 1000, height: 800 });
    const { unmount } = renderKeepCenter(controller, () => []);

    unmount();
    resize(600, 800);

    expect(graph.getPosition()).toEqual(new Point(100, 50));
  });
});
