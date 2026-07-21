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
import { useEffect } from 'react';

/**
 * Pans the topology graph to bring the selected node into view.
 *
 * Fires a delayed panIntoView when exactly one id is selected and the
 * controller resolves it to a live graph node. Does nothing for empty
 * selection, multi-selection, or unresolvable ids.
 *
 * The 500ms delay allows layout animations to settle before panning.
 */
export const useSelectedNodePanIntoView = (selectedIds: string[]): void => {
  const controller = useVisualizationController();

  useEffect(() => {
    if (selectedIds.length !== 1) return;

    const resizeTimeout = setTimeout(
      action(() => {
        const graphNode = controller.getNodeById(selectedIds[0]);
        if (graphNode) {
          controller.getGraph().panIntoView(graphNode, { offset: 150, minimumVisible: 100 });
        }
      }),
      500,
    );

    return () => {
      clearTimeout(resizeTimeout);
    };
  }, [selectedIds, controller]);
};
