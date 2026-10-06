import { action, Controller, GraphElement, isEdge, isNode } from '@patternfly/react-topology';
import { isEqual } from 'lodash';

import type { OverlayStore } from '../../../store/overlay.store';
import type { CanvasNode, CanvasNodesAndEdges } from '../Canvas/canvas.models';
import type { CanvasOverlay, CanvasOverlayData } from './canvas-overlay-data';
import type { OverlayStoreSnapshot } from './overlay-layer-snapshot';

/** Captures the exact model for which the caller created the scoped store. */
export interface CanvasOverlayBinding {
  readonly model: CanvasNodesAndEdges;
  readonly store: OverlayStore;
}

function findRouteNodeId(nodes: readonly CanvasNode[], routeId: string): string | undefined {
  const matches = nodes.filter((node) => node.group && !node.parentNode && node.data?.vizNode?.getId() === routeId);
  return matches.length === 1 ? matches[0].id : undefined;
}

function collectElementOverlays(model: CanvasNodesAndEdges, layers: OverlayStoreSnapshot) {
  const nodes = model.nodes.filter((node) => !node.data?.vizNode?.data.isPlaceholder);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgeIds = new Set(
    model.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)).map((edge) => edge.id),
  );
  const result = new Map<string, CanvasOverlay[]>();
  for (const { ownerId, layerId, entries } of layers) {
    for (const entry of entries) {
      let id: string | undefined;
      if (entry.target.kind === 'route') {
        id = findRouteNodeId(nodes, entry.target.id);
      } else if ((entry.target.kind === 'node' ? nodeIds : edgeIds).has(entry.target.id)) {
        id = entry.target.id;
      }
      if (id === undefined) continue;
      const overlays = result.get(id) ?? [];
      overlays.push({ key: JSON.stringify([ownerId, layerId, entry.id]), entry });
      result.set(id, overlays);
    }
  }
  return result;
}

/** Updates element data only. Renderers observe it; no DOM lookup, model rebuild or layout. */
export function bindCanvasOverlays(controller: Controller, { model, store }: CanvasOverlayBinding): () => void {
  const attached = new Map<GraphElement, readonly CanvasOverlay[]>();
  const clear = action(() => {
    for (const [element, overlays] of attached) {
      const data: CanvasOverlayData = element.getData() ?? {};
      if (data.overlays === overlays) {
        const { overlays: _removed, ...rest } = data;
        element.setData(rest);
      }
    }
    attached.clear();
  });
  const update = action(() => {
    const byElement = collectElementOverlays(model, store.getState().layers);
    for (const element of controller.getElements()) {
      if (!isNode(element) && !isEdge(element)) continue;
      const data: CanvasOverlayData = element.getData() ?? {};
      const next = byElement.get(element.getId());
      if (isEqual(data.overlays, next)) continue;
      if (next) {
        const overlays = Object.freeze(next);
        element.setData({ ...data, overlays });
        attached.set(element, overlays);
      } else if (attached.has(element)) {
        const { overlays: _removed, ...rest } = data;
        element.setData(rest);
        attached.delete(element);
      }
    }
  });
  update();
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.layers !== previous.layers) update();
  });
  return () => {
    unsubscribe();
    clear();
  };
}
