import { useEffect, useReducer, useState } from 'react';

import { OverlayEntry, OverlayLayer } from '../overlay-entries';
import { createOverlayLayerStore } from '../overlay-layer-store';
import { OverlayScope } from '../overlay-targets';

export type DemoBranch = 'when' | 'otherwise';
export interface DemoOverlay {
  key: string;
  entry: OverlayEntry;
}

export const demoAnnotatedEdge = { startX: 150, endX: 250, y: 357.5 };
export const demoEdges: { id: string; path: string; branch?: DemoBranch }[] = [
  {
    id: 'from-1199-choice-1601',
    path: `M${demoAnnotatedEdge.startX} ${demoAnnotatedEdge.y} H${demoAnnotatedEdge.endX}`,
  },
  { id: 'when-2399-to-1402', path: 'M250 357.5 H270 V322.5 H350', branch: 'when' },
  { id: 'to-1402-choice-exit', path: 'M410 322.5 H660 V357.5 H690', branch: 'when' },
  { id: 'otherwise-3621-to-3904', path: 'M250 357.5 H270 V557.5 H350', branch: 'otherwise' },
  { id: 'to-3904-choice-exit', path: 'M410 557.5 H660 V357.5 H690', branch: 'otherwise' },
  { id: 'choice-1601-to-2430', path: 'M690 357.5 H810' },
];
const nodeIds = ['from-1199', 'to-1402', 'to-3904', 'to-2430'];
const scope: OverlayScope = { canvasId: 'overlay-demo', documentId: 'route-1837', modelRevision: 'fixed' };

const pathEntries = (branch: DemoBranch): OverlayEntry[] => [
  ...['from-1199', branch === 'when' ? 'to-1402' : 'to-3904', 'to-2430'].map(
    (id): OverlayEntry => ({ id, kind: 'highlight', target: { kind: 'node', id }, emphasis: 'strong' }),
  ),
  ...demoEdges
    .filter((edge) => !edge.branch || edge.branch === branch)
    .map(({ id }): OverlayEntry => ({ id, kind: 'highlight', target: { kind: 'edge', id }, emphasis: 'strong' })),
];
const countEntries = (count: number): OverlayEntry[] =>
  nodeIds.map((id) => ({
    id,
    kind: 'annotation',
    target: { kind: 'node', id },
    text: '',
    value: id === 'to-3904' ? 0 : count,
    interaction: { accessibleLabel: `${id} message count`, tooltip: 'Messages processed by this step (demo)' },
  }));
const timingEntries: OverlayEntry[] = [
  {
    id: 'route-duration',
    kind: 'annotation',
    target: { kind: 'route', id: 'route-1837' },
    text: 'Route total',
    value: 12.5,
    unit: 'ms',
    interaction: { accessibleLabel: 'route-1837 annotation', tooltip: 'Fixed demonstration value' },
  },
  {
    id: 'edge-duration',
    kind: 'annotation',
    target: { kind: 'edge', id: 'from-1199-choice-1601' },
    text: 'Edge duration',
    value: 2.75,
    unit: 'ms',
    interaction: { accessibleLabel: 'edge metric annotation', tooltip: 'Fixed demonstration value' },
  },
];

interface DemoActions {
  showPath(branch: DemoBranch): void;
  clearPath(): void;
  updateCounts(): void;
  removeXmppCount(): void;
  clearCounts(): void;
  disconnectMetrics(): void;
}
interface DemoView {
  layers: readonly OverlayLayer[];
  branch?: DemoBranch;
  metricsConnected: boolean;
  actions?: DemoActions;
}

/** Demo-owned operations publish detached store views. This is not a live canvas subscription API. */
export function useOverlayDemo() {
  const [generation, reset] = useReducer((value: number) => value + 1, 0);
  const [view, setView] = useState<DemoView>({ layers: [], metricsConnected: false });

  useEffect(() => {
    const store = createOverlayLayerStore({
      scope,
      targets: [
        ...nodeIds.map((id) => ({ kind: 'node' as const, id })),
        ...demoEdges.map(({ id }) => ({ kind: 'edge' as const, id })),
        { kind: 'route', id: 'route-1837' },
      ],
    });
    const pathOwner = store.createOwner()!;
    const metricsOwner = store.createOwner()!;
    let active = true;
    let branch: DemoBranch | undefined = 'when';
    let count = 42;
    let metricsConnected = true;
    const publish = () => {
      setView({ layers: store.getLayers(), branch, metricsConnected, actions: demoActions });
    };
    const run = (operation: () => void) => {
      if (!active) return;
      operation();
      publish();
    };
    pathOwner.replaceLayer(scope, 'path', pathEntries(branch));
    metricsOwner.replaceLayer(scope, 'counts', countEntries(count));
    metricsOwner.replaceLayer(scope, 'timings', timingEntries);
    const demoActions: DemoActions = {
      showPath: (next) => {
        run(() => {
          pathOwner.replaceLayer(scope, 'path', pathEntries(next));
          branch = next;
        });
      },
      clearPath: () => {
        run(() => {
          pathOwner.clearLayer(scope, 'path');
          branch = undefined;
        });
      },
      updateCounts: () => {
        run(() => {
          if (metricsConnected) metricsOwner.upsertEntries(scope, 'counts', countEntries(++count));
        });
      },
      removeXmppCount: () => {
        run(() => {
          if (metricsConnected) metricsOwner.removeEntries(scope, 'counts', ['to-3904']);
        });
      },
      clearCounts: () => {
        run(() => {
          if (metricsConnected) metricsOwner.clearLayer(scope, 'counts');
        });
      },
      disconnectMetrics: () => {
        run(() => {
          metricsOwner.dispose();
          metricsConnected = false;
        });
      },
    };
    publish();
    return () => {
      active = false;
      store.dispose();
    };
  }, [generation]);

  const overlays: DemoOverlay[] = view.layers.flatMap(({ ownerId, layerId, entries }) =>
    entries.map((entry) => ({ key: JSON.stringify([ownerId, layerId, entry.id]), entry })),
  );
  return { ...view, overlays, reset };
}
