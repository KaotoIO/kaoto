import { Visualization } from '@patternfly/react-topology';

import { createVisualizationNode } from '../../../models';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { createOverlayStore } from '../../../store/overlay.store';
import { CanvasNodesAndEdges } from '../Canvas/canvas.models';
import { bindCanvasOverlays } from './canvas-overlay-binding';
import { OverlayEntry } from './overlay-entries';

const scope = { canvasId: 'canvas', documentId: 'routes.yaml', modelRevision: '1' };
const note = (id: string, kind: 'node' | 'edge' | 'route', targetId: string, value = 42): OverlayEntry => ({
  id,
  kind: 'annotation',
  target: { kind, id: targetId },
  text: 'Count',
  value,
  interaction: { accessibleLabel: id },
});
function setup() {
  const vizNode = createVisualizationNode('route', {
    name: 'route',
    isPlaceholder: false,
    isGroup: true,
    iconUrl: '',
    title: '',
    description: '',
    path: 'route',
    definition: { id: 'route' },
    entity: new CamelRouteVisualEntity({ route: { id: 'route', from: { uri: 'direct:test', steps: [] } } }),
  });
  const model: CanvasNodesAndEdges = {
    nodes: [
      { id: 'route|root', type: 'group', group: true, children: ['step', 'other'], data: { vizNode } },
      { id: 'step', type: 'node', parentNode: 'route|root' },
      { id: 'other', type: 'node', parentNode: 'route|root' },
    ],
    edges: [{ id: 'edge', type: 'edge', source: 'step', target: 'other', data: { extra: 'preserved' } }],
  };
  const controller = new Visualization();
  controller.fromModel({ ...model, graph: { id: 'graph', type: 'graph' } });
  const store = createOverlayStore({
    scope,
    targets: [
      { kind: 'node', id: 'step' },
      { kind: 'node', id: 'other' },
      { kind: 'node', id: 'route|root' },
      { kind: 'edge', id: 'edge' },
      { kind: 'route', id: 'route' },
    ],
  });
  return { model, controller, store, owner: store.getState().createOwner()!, vizNode };
}

it('attaches typed presentation data to nodes, edges and route groups without mutating source models', () => {
  const { model, controller, store, owner, vizNode } = setup();
  const original = JSON.stringify(vizNode.data.definition);
  const release = bindCanvasOverlays(controller, { model, store });
  const layout = vi.spyOn(controller.getGraph(), 'layout');
  const fromModel = vi.spyOn(controller, 'fromModel');
  const path: OverlayEntry = { id: 'visited', kind: 'highlight', target: { kind: 'node', id: 'step' } };
  owner.replaceLayer(scope, 'metrics', [
    note('node', 'node', 'step'),
    note('edge', 'edge', 'edge'),
    note('route', 'route', 'route'),
    path,
  ]);
  expect(
    controller
      .getElementById('step')!
      .getData()
      .overlays.map((item: { entry: OverlayEntry }) => item.entry.id),
  ).toEqual(['node', 'visited']);
  expect(controller.getElementById('edge')!.getData()).toMatchObject({
    extra: 'preserved',
    overlays: [{ entry: { id: 'edge' } }],
  });
  expect(controller.getElementById('route|root')!.getData().overlays[0].entry.id).toBe('route');
  expect(controller.getElementById('other')!.getData()?.overlays).toBeUndefined();
  expect(model.nodes[1].data).toBeUndefined();
  expect(model.edges[0].data).toEqual({ extra: 'preserved' });
  expect(JSON.stringify(vizNode.data.definition)).toBe(original);
  expect(layout).not.toHaveBeenCalled();
  expect(fromModel).not.toHaveBeenCalled();
  release();
  expect(controller.getElementById('step')!.getData().overlays).toBeUndefined();
  expect(controller.getElementById('edge')!.getData().extra).toBe('preserved');
  owner.upsertEntries(scope, 'metrics', [note('node', 'node', 'step', 99)]);
  expect(controller.getElementById('step')!.getData().overlays).toBeUndefined();
});

it('keeps owner identities separate and removes metadata on clear and disposal', () => {
  const { model, controller, store, owner } = setup();
  const second = store.getState().createOwner()!;
  owner.replaceLayer(scope, 'metrics', [note('same', 'node', 'step')]);
  second.replaceLayer(scope, 'metrics', [note('same', 'node', 'step', 9)]);
  const release = bindCanvasOverlays(controller, { model, store });
  const node = controller.getElementById('step')!;
  const entries = node.getData().overlays;
  expect(entries).toHaveLength(2);
  expect(entries[0].key).not.toBe(entries[1].key);
  owner.clearLayer(scope, 'metrics');
  expect(node.getData().overlays).toHaveLength(1);
  expect(node.getData().overlays[0].entry.value).toBe(9);
  store.getState().dispose();
  expect(node.getData().overlays).toBeUndefined();
  release();
});
