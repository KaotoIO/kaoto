import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren, StrictMode } from 'react';

import { createVisualizationNode } from '../../../models';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows';
import { createOverlayStore } from '../../../store/overlay.store';
import { CanvasNodesAndEdges } from '../Canvas/canvas.models';
import { OverlayEntry } from './overlay-entries';
import { CanvasOverlayContext, useCanvasOverlays } from './use-canvas-overlays';

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
      { id: 'edge', type: 'node', parentNode: 'route|root' },
    ],
    edges: [{ id: 'edge', type: 'edge', source: 'step', target: 'other', data: { extra: 'preserved' } }],
  };
  const store = createOverlayStore({
    scope,
    targets: [
      { kind: 'node', id: 'step' },
      { kind: 'node', id: 'other' },
      { kind: 'node', id: 'edge' },
      { kind: 'node', id: 'route|root' },
      { kind: 'edge', id: 'edge' },
      { kind: 'route', id: 'route' },
    ],
  });
  const source = { model, store };
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <CanvasOverlayContext.Provider value={source}>{children}</CanvasOverlayContext.Provider>
    </StrictMode>
  );
  return { source, model, store, owner: store.getState().createOwner()!, wrapper };
}

it('selects node, edge and route entries by identity without modifying model data', () => {
  const { model, owner, wrapper } = setup();
  const original = model.nodes.map((node) => node.data);
  owner.replaceLayer(scope, 'metrics', [
    note('node', 'node', 'step'),
    note('edge', 'edge', 'edge'),
    note('same-id-node', 'node', 'edge'),
    note('route', 'route', 'route'),
    { id: 'visited', kind: 'highlight', target: { kind: 'node', id: 'step' } },
    { id: 'group', kind: 'highlight', target: { kind: 'node', id: 'route|root' } },
  ]);
  const { result, rerender } = renderHook(
    ({ kind, id }: { kind: 'node' | 'edge'; id: string }) => useCanvasOverlays(kind, id),
    {
      wrapper,
      initialProps: { kind: 'node', id: 'step' },
    },
  );
  expect(result.current.map(({ entry }) => entry.id)).toEqual(['node', 'visited']);
  rerender({ kind: 'edge', id: 'edge' });
  expect(result.current.map(({ entry }) => entry.id)).toEqual(['edge']);
  rerender({ kind: 'node', id: 'edge' });
  expect(result.current.map(({ entry }) => entry.id)).toEqual(['same-id-node']);
  rerender({ kind: 'node', id: 'route|root' });
  expect(result.current.map(({ entry }) => entry.id)).toEqual(['route', 'group']);
  rerender({ kind: 'node', id: 'other' });
  expect(result.current).toEqual([]);
  model.nodes.forEach((node, index) => {
    expect(node.data).toBe(original[index]);
  });
  expect(model.edges[0].data).toEqual({ extra: 'preserved' });
});

it('does not attach route annotations to an ambiguous root group', () => {
  const { model, owner, wrapper } = setup();
  model.nodes.push({ ...model.nodes[0], id: 'duplicate-root' });
  owner.replaceLayer(scope, 'metrics', [note('route', 'route', 'route'), note('group', 'node', 'route|root')]);
  const { result } = renderHook(() => useCanvasOverlays('node', 'route|root'), { wrapper });
  expect(result.current.map(({ entry }) => entry.id)).toEqual(['group']);
});

it('ignores missing elements, placeholders and edges connected to placeholders', () => {
  const { model, owner, wrapper } = setup();
  model.nodes[1].data = {
    vizNode: createVisualizationNode('placeholder', {
      isPlaceholder: true,
      name: '',
      path: '',
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    }),
  };
  owner.replaceLayer(scope, 'metrics', [note('step', 'node', 'step'), note('edge', 'edge', 'edge')]);
  const { result, rerender } = renderHook(
    ({ kind, id }: { kind: 'node' | 'edge'; id: string }) => useCanvasOverlays(kind, id),
    { wrapper, initialProps: { kind: 'node', id: 'step' } },
  );
  expect(result.current).toEqual([]);
  rerender({ kind: 'edge', id: 'edge' });
  expect(result.current).toEqual([]);
  rerender({ kind: 'node', id: 'missing' });
  expect(result.current).toEqual([]);
  rerender({ kind: 'edge', id: 'missing' });
  expect(result.current).toEqual([]);
});

it('isolates owners and updates subscribers on clearing, owner disposal and store disposal', () => {
  const { store, owner, wrapper } = setup();
  const second = store.getState().createOwner()!;
  owner.replaceLayer(scope, 'metrics', [note('same', 'node', 'step')]);
  second.replaceLayer(scope, 'metrics', [note('same', 'node', 'step', 9)]);
  const { result } = renderHook(() => useCanvasOverlays('node', 'step'), { wrapper });
  expect(result.current).toHaveLength(2);
  expect(result.current[0].key).not.toBe(result.current[1].key);
  act(() => {
    owner.clearLayer(scope, 'metrics');
  });
  expect(result.current).toHaveLength(1);
  expect(result.current[0].entry).toMatchObject({ value: 9 });
  act(() => {
    second.dispose();
  });
  expect(result.current).toEqual([]);
  act(() => {
    owner.replaceLayer(scope, 'metrics', [note('new', 'node', 'step')]);
  });
  expect(result.current).toHaveLength(1);
  act(() => {
    store.getState().dispose();
  });
  expect(result.current).toEqual([]);
});

it('does not rerender a subscriber when another target in the same layer changes', () => {
  const { owner, wrapper } = setup();
  owner.replaceLayer(scope, 'metrics', [note('same', 'node', 'step'), note('other', 'node', 'other')]);
  let renders = 0;
  const { result } = renderHook(
    () => {
      renders++;
      return useCanvasOverlays('node', 'step');
    },
    { wrapper },
  );
  const initial = result.current;
  const initialRenders = renders;
  act(() => {
    owner.upsertEntries(scope, 'metrics', [note('other', 'node', 'other', 99)]);
  });
  expect(result.current).toBe(initial);
  expect(renders).toBe(initialRenders);
  act(() => {
    owner.upsertEntries(scope, 'metrics', [note('same', 'node', 'step', 43)]);
  });
  expect(result.current[0].entry).toMatchObject({ value: 43 });
  expect(renders).toBeGreaterThan(initialRenders);
});

it('isolates identical IDs in different canvases and releases subscriptions when switching or unmounting', () => {
  const first = setup();
  const second = setup();
  first.owner.replaceLayer(scope, 'metrics', [note('count', 'node', 'step', 1)]);
  second.owner.replaceLayer(scope, 'metrics', [note('count', 'node', 'step', 2)]);
  const release = vi.fn();
  const subscribe = first.store.subscribe;
  vi.spyOn(first.store, 'subscribe').mockImplementation((listener) => {
    const unsubscribe = subscribe(listener);
    return () => {
      release();
      unsubscribe();
    };
  });
  let source = first.source;
  const wrapper = ({ children }: PropsWithChildren) => (
    <CanvasOverlayContext.Provider value={source}>{children}</CanvasOverlayContext.Provider>
  );
  const { result, rerender, unmount } = renderHook(() => useCanvasOverlays('node', 'step'), { wrapper });
  const other = renderHook(() => useCanvasOverlays('node', 'step'), { wrapper: second.wrapper });
  expect(result.current[0].entry).toMatchObject({ value: 1 });
  expect(other.result.current[0].entry).toMatchObject({ value: 2 });
  source = second.source;
  rerender();
  expect(release).toHaveBeenCalledOnce();
  act(() => {
    first.owner.upsertEntries(scope, 'metrics', [note('count', 'node', 'step', 3)]);
  });
  expect(result.current[0].entry).toMatchObject({ value: 2 });
  source = first.source;
  rerender();
  unmount();
  expect(release).toHaveBeenCalledTimes(2);
  expect(first.store.getState().disposed).toBe(false);
});

it('keeps an empty selection stable without a canvas provider', () => {
  const { result, rerender } = renderHook(() => useCanvasOverlays('node', 'step'));
  const initial = result.current;
  expect(initial).toEqual([]);
  rerender();
  expect(result.current).toBe(initial);
});
