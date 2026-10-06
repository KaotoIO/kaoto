import { CamelRouteVisualEntity } from '../../../models/visualization/flows/camel-route-visual-entity';
import { createVisualizationNode } from '../../../models/visualization/visualization-node';
import { CanvasNodesAndEdges } from '../Canvas/canvas.models';
import { buildDesignerCanvasModel } from '../designer-canvas-model';
import { buildDesignerOverlayTargetSnapshot } from './designer-overlay-targets';
import { createOverlayTargetIndex, OverlayScope } from './overlay-targets';

const scope: OverlayScope = { canvasId: 'designer', documentId: 'routes.yaml', modelRevision: '1' };

function createNode(id: string, isGroup = false) {
  return createVisualizationNode(id, {
    name: id,
    isGroup,
    isPlaceholder: false,
    iconUrl: '',
    title: '',
    description: '',
  });
}

function createFlow(id: string) {
  const root = createNode(id, true);
  const first = createNode('log-1');
  const second = createNode('log-2');
  root.addChild(first);
  root.addChild(second);
  first.setNextNode(second);
  second.setPreviousNode(first);
  return root;
}

describe('buildDesignerOverlayTargetSnapshot', () => {
  it('keeps repeated local step identities separate across real flow models', () => {
    const model = buildDesignerCanvasModel([createFlow('route-1'), createFlow('route-2')]);
    const routes = [
      new CamelRouteVisualEntity({ route: { id: 'route-1', from: { uri: 'direct:one' } } }),
      new CamelRouteVisualEntity({ route: { id: 'route-2', from: { uri: 'direct:two' } } }),
    ];
    const index = createOverlayTargetIndex(buildDesignerOverlayTargetSnapshot(scope, model, routes));

    for (const id of ['route-1|log-1', 'route-2|log-1']) {
      expect(index.resolve(scope, { kind: 'node', id })).toEqual({
        status: 'resolved',
        target: { kind: 'node', id },
      });
    }
    expect(index.resolve(scope, { kind: 'node', id: 'log-1' })).toEqual({ status: 'missing' });
    expect(index.list()).toEqual(
      expect.arrayContaining([
        { kind: 'edge', id: 'route-1|log-1 >>> log-2' },
        { kind: 'edge', id: 'route-2|log-1 >>> log-2' },
        { kind: 'route', id: 'route-1' },
        { kind: 'route', id: 'route-2' },
      ]),
    );
  });

  it('retains nested targets when their parent group is collapsed', () => {
    const parent = createNode('parent', true);
    parent.addChild(createFlow('nested'));
    const model = buildDesignerCanvasModel([parent]);
    const group = model.nodes.find((node) => node.id === 'parent|nested')!;
    group.collapsed = true;
    const snapshot = buildDesignerOverlayTargetSnapshot(scope, model, []);

    expect(snapshot.targets).toEqual(
      expect.arrayContaining([
        { kind: 'node', id: 'parent|log-1' },
        { kind: 'node', id: 'parent|log-2' },
        { kind: 'edge', id: 'parent|log-1 >>> log-2' },
      ]),
    );
  });

  it('excludes placeholders and edges connected to placeholder or absent nodes', () => {
    const flow = createFlow('route-1');
    flow.getChildren()![1].data.isPlaceholder = true;
    const model = buildDesignerCanvasModel([flow]);
    model.edges.push({ id: 'dangling', type: 'edge', source: 'route-1|log-1', target: 'absent' });

    expect(buildDesignerOverlayTargetSnapshot(scope, model, []).targets).toEqual([
      { kind: 'node', id: 'route-1|log-1' },
      { kind: 'node', id: 'route-1|route-1' },
    ]);
  });

  it('retains duplicate node, edge, and route identities for ambiguity reporting', () => {
    const model = buildDesignerCanvasModel([createFlow('route-1')]);
    model.nodes.push({ ...model.nodes[0] });
    model.edges.push({ ...model.edges[0] });
    const routes = [{ id: 'route-1' }, { id: 'route-1' }];
    const index = createOverlayTargetIndex(buildDesignerOverlayTargetSnapshot(scope, model, routes));

    expect(index.resolve(scope, { kind: 'node', id: 'route-1|log-1' })).toEqual({ status: 'ambiguous' });
    expect(index.resolve(scope, { kind: 'edge', id: 'route-1|log-1 >>> log-2' })).toEqual({ status: 'ambiguous' });
    expect(index.resolve(scope, { kind: 'route', id: 'route-1' })).toEqual({ status: 'ambiguous' });
  });

  it('keeps a route distinct from a node with the same ID', () => {
    const model: CanvasNodesAndEdges = { nodes: [{ id: 'shared', type: 'node' }], edges: [] };
    const index = createOverlayTargetIndex(buildDesignerOverlayTargetSnapshot(scope, model, [{ id: 'shared' }]));

    expect(index.list()).toEqual([
      { kind: 'node', id: 'shared' },
      { kind: 'route', id: 'shared' },
    ]);
    expect(index.resolve(scope, { kind: 'route', id: 'shared' })).toEqual({
      status: 'resolved',
      target: { kind: 'route', id: 'shared' },
    });
  });

  it('includes explicitly supplied routes even without a mounted entry node', () => {
    const route = new CamelRouteVisualEntity({ route: { id: 'route-hidden', from: { uri: 'direct:hidden' } } });
    const snapshot = buildDesignerOverlayTargetSnapshot(scope, { nodes: [], edges: [] }, [route]);

    expect(snapshot.targets).toEqual([{ kind: 'route', id: 'route-hidden' }]);
  });

  it('does not infer routes from nodes or create targets for an empty model', () => {
    expect(buildDesignerOverlayTargetSnapshot(scope, { nodes: [], edges: [] }, []).targets).toEqual([]);
    const model = buildDesignerCanvasModel([createFlow('route-like-name')]);

    expect(buildDesignerOverlayTargetSnapshot(scope, model, []).targets.some(({ kind }) => kind === 'route')).toBe(false);
  });

  it('leaves inputs unchanged and detaches snapshot records from the model', () => {
    const model = buildDesignerCanvasModel([createFlow('route-1')]);
    const routes = [new CamelRouteVisualEntity({ route: { id: 'route-1', from: { uri: 'direct:one' } } })];
    const inputScope = Object.freeze({ ...scope });
    const beforeModel = cloneDeep(model);
    const beforeRoutes = JSON.stringify(routes);
    const snapshot = buildDesignerOverlayTargetSnapshot(inputScope, model, routes);

    expect(model).toEqual(beforeModel);
    expect(JSON.stringify(routes)).toBe(beforeRoutes);
    snapshot.scope.modelRevision = 'changed';
    snapshot.targets[0].id = 'changed';
    expect(inputScope.modelRevision).toBe('1');
    expect(model.nodes[0].id).toBe('route-1|log-1');

    model.edges[0].id = 'changed-edge';
    routes[0].setId('changed-route');
    expect(snapshot.targets).toEqual(
      expect.arrayContaining([
        { kind: 'edge', id: 'route-1|log-1 >>> log-2' },
        { kind: 'route', id: 'route-1' },
      ]),
    );
  });
});
import { cloneDeep } from 'lodash';
