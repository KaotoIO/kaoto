import type { Controller } from '@patternfly/react-topology';

import type { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import type { CanvasNode } from './canvas.models';

interface NodeSelectionState {
  pendingNodeSelection?: { entityId: string; path: string };
}

/** Defer selection until the inserted step is present in the refreshed canvas model. */
export function requestNodeSelection(controller: Controller, vizNode: IVisualizationNode, path: string | void) {
  const entityId = vizNode.getId();
  if (entityId && path) {
    controller.setState({ pendingNodeSelection: { entityId, path } });
  }
}

export function consumeNodeSelection(controller: Controller, nodes: CanvasNode[]): string[] | undefined {
  const selection = controller.getState<NodeSelectionState>().pendingNodeSelection;
  if (!selection) return;
  controller.setState({ pendingNodeSelection: undefined });

  // Inserting a processor can also create child nodes. Select the inserted parent.
  const candidates = nodes.filter(({ data }) => {
    const vizNode = data?.vizNode;
    const path = vizNode?.data.path;
    return (
      vizNode?.getId() === selection.entityId &&
      !vizNode.data.isPlaceholder &&
      (path === selection.path || path?.startsWith(`${selection.path}.`))
    );
  });
  candidates.sort((a, b) => (a.data?.vizNode?.data.path?.length ?? 0) - (b.data?.vizNode?.data.path?.length ?? 0));
  return candidates.length > 0 ? [candidates[0].id] : undefined;
}
