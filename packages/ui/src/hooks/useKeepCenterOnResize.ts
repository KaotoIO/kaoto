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
import { action, Point, useVisualizationController } from '@patternfly/react-topology';
import { comparer, reaction } from 'mobx';
import { useEffect, useRef } from 'react';

/**
 * Keeps the graph in view when its container is resized, e.g. when VS Code opens the source code to the
 * side, which makes the webview narrower.
 *
 * - Nothing selected: the visible center is kept fixed, so a centered graph stays centered.
 * - One node selected: the graph is panned just enough to keep that node in view.
 *
 * Zero-sized measurements (hidden container) are ignored and the last non-zero size is used as reference.
 */
export const useKeepCenterOnResize = (selectedIds: string[]): void => {
  const controller = useVisualizationController();
  const selectedIdsRef = useRef(selectedIds);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    let previous: { width: number; height: number } | undefined;

    return reaction(
      () => {
        if (!controller.hasGraph()) return undefined;
        const { width, height } = controller.getGraph().getDimensions();
        return { width, height };
      },
      action((current) => {
        if (!current || current.width === 0 || current.height === 0) return;

        const graph = controller.getGraph();
        const selection = selectedIdsRef.current;
        const hasSelection = selection.length > 0;

        if (previous) {
          if (!hasSelection) {
            const { x, y } = graph.getPosition();
            graph.setPosition(
              new Point(x + (current.width - previous.width) / 2, y + (current.height - previous.height) / 2),
            );
          } else if (selection.length === 1) {
            const graphNode = controller.getNodeById(selection[0]);
            if (graphNode) {
              graph.panIntoView(graphNode, { offset: 150, minimumVisible: 100 });
            }
          }
        }

        previous = current;
      }),
      { fireImmediately: true, equals: comparer.structural },
    );
  }, [controller]);
};
