import { renderHook, waitFor } from '@testing-library/react';

import { useVisibleVizNodes } from '../../../hooks/use-visible-viz-nodes';
import { EntityType } from '../../../models/entities';
import { BaseVisualEntity, IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows/camel-route-visual-entity';
import { createVisualizationNode } from '../../../models/visualization/visualization-node';
import { collectDesignerOverlayTargets } from './collect-designer-overlay-targets';
import { createOverlayTargetSession } from './overlay-target-session';

function node(id: string, isGroup = false, isPlaceholder = false) {
  return createVisualizationNode(id, {
    name: id,
    isGroup,
    isPlaceholder,
    iconUrl: '',
    title: '',
    description: '',
  });
}

function flow(id: string) {
  const root = node(id, true);
  const nested = node('nested', true);
  const first = node('log-1');
  const second = node('log-2');
  const placeholder = node('placeholder', false, true);
  first.setNextNode(second);
  second.setNextNode(placeholder);
  nested.addChild(first);
  nested.addChild(second);
  nested.addChild(placeholder);
  root.addChild(nested);
  return root;
}

function route(id: string) {
  const entity = new CamelRouteVisualEntity({ route: { id, from: { uri: `direct:${id}`, steps: [] } } });
  // Control async conversion, while using real visualization nodes and canvas model building.
  vi.spyOn(entity, 'toVizNode').mockResolvedValue(flow(id));
  return entity;
}

function deferredNode() {
  let resolve!: (value: IVisualizationNode) => void;
  const promise = new Promise<IVisualizationNode>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('collectDesignerOverlayTargets', () => {
  it('collects both routes even when the view only shows one, retaining nested steps and omitting placeholders', async () => {
    const entities = [route('route-1'), route('route-2')];
    const visible = { 'route-1': true, 'route-2': false };
    const { result } = renderHook(() => useVisibleVizNodes(entities, visible));
    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.vizNodes).toHaveLength(1);

    const targets = await collectDesignerOverlayTargets(entities, new AbortController().signal);
    expect(targets).toEqual(
      expect.arrayContaining([
        { kind: 'route', id: 'route-1' },
        { kind: 'route', id: 'route-2' },
        { kind: 'node', id: 'route-1|log-1' },
        { kind: 'node', id: 'route-2|log-1' },
        { kind: 'node', id: 'route-2|nested' },
        { kind: 'edge', id: 'route-2|log-1 >>> log-2' },
      ]),
    );
    expect(targets.some(({ id }) => id.includes('placeholder'))).toBe(false);
  });

  it('only exposes actual route entities as route targets', async () => {
    const other = {
      id: 'rest-1',
      type: EntityType.Rest,
      toVizNode: async () => flow('rest-1'),
    } as BaseVisualEntity;
    const targets = await collectDesignerOverlayTargets([route('route-1'), other], new AbortController().signal);

    expect(targets.filter(({ kind }) => kind === 'route')).toEqual([{ kind: 'route', id: 'route-1' }]);
    expect(targets).toContainEqual({ kind: 'node', id: 'rest-1|log-1' });
  });

  it('resolves an empty document to no targets', async () => {
    expect(await collectDesignerOverlayTargets([], new AbortController().signal)).toEqual([]);
  });

  it('rejects an already cancelled collection before conversion', async () => {
    const entity = route('route-1');
    const controller = new AbortController();
    controller.abort();

    await expect(collectDesignerOverlayTargets([entity], controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(entity.toVizNode).not.toHaveBeenCalled();
  });

  it('cancels between conversions without publishing partial results', async () => {
    const first = route('route-1');
    const second = route('route-2');
    const pending = deferredNode();
    vi.mocked(first.toVizNode).mockReturnValue(pending.promise);
    const controller = new AbortController();
    const collection = collectDesignerOverlayTargets([first, second], controller.signal);
    const rejection = expect(collection).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    pending.resolve(flow('route-1'));

    await rejection;
    expect(second.toVizNode).not.toHaveBeenCalled();
  });

  it('propagates a conversion failure instead of publishing the successful subset', async () => {
    const first = route('route-1');
    const second = route('route-2');
    const error = new Error('Could not resolve route');
    vi.mocked(second.toVizNode).mockRejectedValue(error);

    await expect(collectDesignerOverlayTargets([first, second], new AbortController().signal)).rejects.toBe(error);
  });

  it('captures collection membership and route IDs before awaiting conversions', async () => {
    const first = route('route-1');
    const second = route('route-2');
    const entities = [first, second];
    const pending = deferredNode();
    vi.mocked(first.toVizNode).mockReturnValue(pending.promise);
    const collection = collectDesignerOverlayTargets(entities, new AbortController().signal);
    entities.splice(0, entities.length, route('replacement'));
    second.setId('edited-route');
    pending.resolve(flow('route-1'));
    const targets = await collection;

    expect(targets.filter(({ kind }) => kind === 'route')).toEqual([
      { kind: 'route', id: 'route-1' },
      { kind: 'route', id: 'route-2' },
    ]);
    expect(targets).toContainEqual({ kind: 'node', id: 'route-2|log-1' });
    expect(targets.some(({ id }) => id.includes('replacement'))).toBe(false);
  });

  it('cannot publish a completed old collection after the session switches documents', async () => {
    const oldRoute = route('old');
    const pending = deferredNode();
    vi.mocked(oldRoute.toVizNode).mockReturnValue(pending.promise);
    const session = createOverlayTargetSession();
    const oldRefresh = session.refresh('old.yaml', (signal) => collectDesignerOverlayTargets([oldRoute], signal));
    const oldState = session.getState();
    expect(await session.refresh('new.yaml', (signal) => collectDesignerOverlayTargets([route('new')], signal))).toBe(
      'applied',
    );
    pending.resolve(flow('old'));

    expect(await oldRefresh).toBe('superseded');
    expect(session.list()).toContainEqual({ kind: 'route', id: 'new' });
    expect(session.list().some(({ id }) => id.includes('old'))).toBe(false);
    if (!('scope' in oldState)) throw new Error('Expected an active scope');
    expect(session.resolve(oldState.scope, { kind: 'route', id: 'old' })).toEqual({ status: 'stale' });
  });
});
