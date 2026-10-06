import { isEqual } from 'lodash';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { createStore } from 'zustand/vanilla';

import type { OverlayState, OverlayStore } from '../../../store/overlay.store';
import type { CanvasNode, CanvasNodesAndEdges } from '../Canvas/canvas.models';
import type { CanvasOverlay } from './overlay-layer-snapshot';
import type { OverlayTarget } from './overlay-targets';

/** The store belongs to this exact model; replacing the model requires a new source. */
export interface CanvasOverlaySource {
  readonly model: CanvasNodesAndEdges;
  readonly store: OverlayStore;
}

export const CanvasOverlayContext = createContext<CanvasOverlaySource | undefined>(undefined);
const emptyStore = createStore<Pick<OverlayState, 'layers'>>(() => ({ layers: [] }));

function getRouteTarget(node: CanvasNode, nodes: readonly CanvasNode[]): OverlayTarget[] {
  if (!node.group || node.parentNode) return [];
  const routeId = node.data?.vizNode?.getId();
  const roots = nodes.filter((node) => node.group && !node.parentNode && node.data?.vizNode?.getId() === routeId);
  return routeId !== undefined && roots.length === 1 ? [{ kind: 'route', id: routeId }] : [];
}

function getElementTargets(model: CanvasNodesAndEdges | undefined, kind: 'node' | 'edge', id: string): OverlayTarget[] {
  if (!model) return [];
  const nodes = model.nodes.filter((node) => !node.data?.vizNode?.data.isPlaceholder);
  if (kind === 'edge') {
    const edge = model.edges.find((edge) => edge.id === id);
    return edge && nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target)
      ? [{ kind, id }]
      : [];
  }
  const node = nodes.find((node) => node.id === id);
  if (!node) return [];
  return [{ kind, id }, ...getRouteTarget(node, nodes)];
}

function selectOverlays({ layers }: Pick<OverlayState, 'layers'>, targets: readonly OverlayTarget[]): CanvasOverlay[] {
  const overlays: CanvasOverlay[] = [];
  for (const { ownerId, layerId, entries } of layers) {
    for (const entry of entries) {
      if (targets.some((target) => target.kind === entry.target.kind && target.id === entry.target.id)) {
        overlays.push({ key: JSON.stringify([ownerId, layerId, entry.id]), entry });
      }
    }
  }
  return overlays;
}

/** Renderers subscribe directly. Equal selections retain their reference and do not rerender. */
export function useCanvasOverlays(kind: 'node' | 'edge', id: string): readonly CanvasOverlay[] {
  const source = useContext(CanvasOverlayContext);
  const targets = useMemo(() => getElementTargets(source?.model, kind, id), [source?.model, kind, id]);
  const select = useCallback((state: Pick<OverlayState, 'layers'>) => selectOverlays(state, targets), [targets]);
  return useStoreWithEqualityFn(source?.store ?? emptyStore, select, isEqual);
}
