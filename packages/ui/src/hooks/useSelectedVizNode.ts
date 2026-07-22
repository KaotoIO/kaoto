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
import { useEffect, useState } from 'react';

import { IVisualizationNode } from '../models/visualization/base-visual-entity';

/**
 * Resolves the selected IVisualizationNode from the topology controller.
 *
 * Returns the vizNode when exactly one id is selected and the controller
 * can resolve it. Returns undefined for empty selection, multi-selection,
 * or when the id does not match any node in the controller.
 */
export const useSelectedVizNode = (selectedIds: string[]): IVisualizationNode | undefined => {
  const controller = useVisualizationController();
  const [selectedVizNode, setSelectedVizNode] = useState<IVisualizationNode | undefined>(undefined);

  useEffect(() => {
    if (selectedIds.length !== 1) {
      setSelectedVizNode(undefined);
      return;
    }

    const graphNode = controller.getNodeById(selectedIds[0]);
    const vizNode = graphNode?.getData()?.vizNode as IVisualizationNode | undefined;
    setSelectedVizNode(vizNode);
  }, [selectedIds, controller]);

  return selectedVizNode;
};
