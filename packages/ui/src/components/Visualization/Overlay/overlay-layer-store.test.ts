import { OverlayEntry } from './overlay-entries';
import { createOverlayLayerStore } from './overlay-layer-store';
import { OverlayScope, OverlayTargetSnapshot } from './overlay-targets';

const scope: OverlayScope = { canvasId: 'canvas', documentId: 'routes.yaml', modelRevision: 'revision' };
const snapshot = (): OverlayTargetSnapshot => ({
  scope: { ...scope },
  targets: [
    { kind: 'node', id: 'route-a|log' },
    { kind: 'node', id: 'route-b|log' },
    { kind: 'edge', id: 'route-a|from >>> log' },
    { kind: 'route', id: 'route-a' },
    { kind: 'node', id: 'duplicate' },
    { kind: 'node', id: 'duplicate' },
  ],
});
const highlight = (id: string, targetId = 'route-a|log'): OverlayEntry => ({
  id,
  kind: 'highlight',
  target: { kind: 'node', id: targetId },
});
const annotation = (): Extract<OverlayEntry, { kind: 'annotation' }> => ({
  id: 'annotation',
  kind: 'annotation',
  target: { kind: 'route', id: 'route-a' },
  text: 'Count',
  value: 0,
  interaction: {
    accessibleLabel: 'Message count',
    tooltip: 'Route count',
  },
});

describe('createOverlayLayerStore', () => {
  it('isolates identical layer and entry IDs across owners', () => {
    const store = createOverlayLayerStore(snapshot());
    const first = store.createOwner()!;
    const second = store.createOwner()!;
    expect(first.ownerId).not.toBe(second.ownerId);
    first.replaceLayer(scope, 'layer', [highlight('same')]);
    second.replaceLayer(scope, 'layer', [highlight('same', 'route-b|log')]);

    first.upsertEntries(scope, 'layer', [annotation()]);
    expect(first.removeEntries(scope, 'layer', ['same'])).toEqual({ status: 'applied', removed: ['same'] });
    expect(first.clearLayer(scope, 'layer')).toEqual({ status: 'applied', removed: ['annotation'] });
    expect(store.getLayers()).toEqual([
      { ownerId: second.ownerId, layerId: 'layer', entries: [highlight('same', 'route-b|log')] },
    ]);
    first.dispose();
    expect(second.upsertEntries(scope, 'layer', [annotation()]).status).toBe('applied');
    expect(store.getLayers()[0].entries).toHaveLength(2);
  });

  it('keeps opaque layer and entry IDs separate without delimiter or prototype collisions', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    owner.replaceLayer(scope, '__proto__', [highlight('a|b'), highlight('constructor')]);
    owner.replaceLayer(scope, 'a|b', [highlight('__proto__')]);
    expect(store.getLayers().map((layer) => [layer.layerId, layer.entries.map((entry) => entry.id)])).toEqual([
      ['__proto__', ['a|b', 'constructor']],
      ['a|b', ['__proto__']],
    ]);
  });

  it('stores explicit mixed entries across routes without inferring extra decorations', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    const entries: OverlayEntry[] = [
      highlight('first'),
      highlight('other-route', 'route-b|log'),
      { id: 'edge', kind: 'highlight', target: { kind: 'edge', id: 'route-a|from >>> log' } },
      annotation(),
      { ...annotation(), id: 'edge-note', target: { kind: 'edge', id: 'route-a|from >>> log' } },
      { ...annotation(), id: 'node-note', target: { kind: 'node', id: 'route-a|log' } },
    ];
    expect(owner.replaceLayer(scope, 'layer', entries)).toEqual({
      status: 'applied',
      applied: ['first', 'other-route', 'edge', 'annotation', 'edge-note', 'node-note'],
      unresolved: [],
    });
    expect(store.getLayers()).toEqual([{ ownerId: owner.ownerId, layerId: 'layer', entries }]);
  });

  it('replaces the entire layer while reporting unresolved targets in request order', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    owner.replaceLayer(scope, 'layer', [highlight('omitted'), highlight('missing')]);
    expect(
      owner.replaceLayer(scope, 'layer', [
        highlight('missing', 'absent'),
        highlight('valid', 'route-b|log'),
        highlight('ambiguous', 'duplicate'),
      ]),
    ).toEqual({
      status: 'applied',
      applied: ['valid'],
      unresolved: [
        { entryId: 'missing', reason: 'missing' },
        { entryId: 'ambiguous', reason: 'ambiguous' },
      ],
    });
    expect(store.getLayers()[0].entries).toEqual([highlight('valid', 'route-b|log')]);
  });

  it.each(['absent', 'duplicate'])('removes a same-ID upsert when target %s cannot resolve', (targetId) => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    owner.replaceLayer(scope, 'layer', [highlight('changed'), highlight('untouched'), highlight('updated')]);
    const result = owner.upsertEntries(scope, 'layer', [
      highlight('changed', targetId),
      highlight('updated', 'route-b|log'),
      highlight('new'),
    ]);
    expect(result).toEqual({
      status: 'applied',
      applied: ['updated', 'new'],
      unresolved: [{ entryId: 'changed', reason: targetId === 'absent' ? 'missing' : 'ambiguous' }],
    });
    expect(store.getLayers()[0].entries).toEqual([
      highlight('untouched'),
      highlight('updated', 'route-b|log'),
      highlight('new'),
    ]);
  });

  it.each(['replaceLayer', 'upsertEntries'] as const)(
    'rejects invalid %s batches without partial changes',
    (method) => {
      const store = createOverlayLayerStore(snapshot());
      const owner = store.createOwner()!;
      owner.replaceLayer(scope, 'layer', [highlight('original')]);
      const before = store.getLayers();
      for (const entries of [
        [highlight('new'), highlight('new')],
        [highlight('new'), { ...annotation(), interaction: { accessibleLabel: '' } }],
      ]) {
        expect(owner[method](scope, 'layer', entries).status).toBe('invalid');
        expect(store.getLayers()).toEqual(before);
      }
      expect(owner[method](scope, '', [highlight('new')]).status).toBe('invalid');
      expect(store.getLayers()).toEqual(before);
    },
  );

  it.each(['canvasId', 'documentId', 'modelRevision'] as const)('rejects all writes with a stale %s', (field) => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    owner.replaceLayer(scope, 'layer', [highlight('original')]);
    const stale = { ...scope, [field]: 'old' };
    const before = store.getLayers();
    expect(owner.replaceLayer(stale, 'layer', [highlight('new')])).toEqual({ status: 'stale' });
    expect(owner.upsertEntries(stale, 'layer', [highlight('new')])).toEqual({ status: 'stale' });
    expect(owner.removeEntries(stale, 'layer', ['original'])).toEqual({ status: 'stale' });
    expect(owner.clearLayer(stale, 'layer')).toEqual({ status: 'stale' });
    expect(store.getLayers()).toEqual(before);
  });

  it('validates removals before applying any and reports only existing IDs in request order', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    owner.replaceLayer(scope, 'layer', [highlight('first'), highlight('second')]);
    for (const ids of [
      ['first', 'first'],
      ['first', ''],
    ]) {
      expect(owner.removeEntries(scope, 'layer', ids).status).toBe('invalid');
      expect(store.getLayers()[0].entries).toHaveLength(2);
    }
    expect(owner.removeEntries(scope, '', ['first']).status).toBe('invalid');
    expect(owner.clearLayer(scope, '').status).toBe('invalid');
    expect(owner.removeEntries(scope, 'layer', ['absent', 'second', 'first'])).toEqual({
      status: 'applied',
      removed: ['second', 'first'],
    });
    expect(store.getLayers()).toEqual([]);
  });

  it('handles empty batches and absent removals without retaining empty layers', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    expect(owner.removeEntries(scope, 'missing', ['absent'])).toEqual({ status: 'applied', removed: [] });
    expect(owner.clearLayer(scope, 'missing')).toEqual({ status: 'applied', removed: [] });
    expect(owner.upsertEntries(scope, 'layer', [])).toEqual({ status: 'applied', applied: [], unresolved: [] });
    expect(store.getLayers()).toEqual([]);
    owner.replaceLayer(scope, 'layer', [highlight('original')]);
    owner.upsertEntries(scope, 'layer', []);
    owner.removeEntries(scope, 'layer', []);
    expect(store.getLayers()[0].entries).toEqual([highlight('original')]);
    owner.replaceLayer(scope, 'layer', []);
    expect(store.getLayers()).toEqual([]);
    owner.replaceLayer(scope, 'unresolved', [highlight('missing', 'absent')]);
    expect(store.getLayers()).toEqual([]);
  });

  it('detaches scope, target membership, entries, tooltip metadata, and result records', () => {
    const input = snapshot();
    const store = createOverlayLayerStore(input);
    const owner = store.createOwner()!;
    input.scope.modelRevision = 'changed';
    input.targets[0].id = 'changed';
    const entry = annotation();
    const requestScope = { ...scope };
    const result = owner.replaceLayer(requestScope, 'layer', [entry]);
    requestScope.canvasId = 'changed';
    entry.target.id = 'changed';
    entry.interaction.tooltip = 'Changed';
    const layers = store.getLayers();
    layers[0].ownerId = 'changed';
    const output = layers[0].entries[0];
    output.target.id = 'changed-again';
    if (output.kind === 'annotation') output.interaction.accessibleLabel = 'Changed';
    if (result.status === 'applied') result.applied.push('extra');
    expect(store.getLayers()).toEqual([{ ownerId: owner.ownerId, layerId: 'layer', entries: [annotation()] }]);
    expect(owner.upsertEntries(scope, 'layer', [highlight('still-valid')]).status).toBe('applied');
  });

  it('revokes disposed owners without affecting live ones and rejects all writes after store disposal', () => {
    const store = createOverlayLayerStore(snapshot());
    const oldOwner = store.createOwner()!;
    const liveOwner = store.createOwner()!;
    oldOwner.replaceLayer(scope, 'layer', [highlight('old')]);
    liveOwner.replaceLayer(scope, 'layer', [highlight('live')]);
    oldOwner.dispose();
    oldOwner.dispose();
    expect(oldOwner.replaceLayer(scope, 'layer', [highlight('late')])).toEqual({ status: 'disposed' });
    expect(store.getLayers()).toEqual([{ ownerId: liveOwner.ownerId, layerId: 'layer', entries: [highlight('live')] }]);
    store.dispose();
    store.dispose();
    const newStore = createOverlayLayerStore(snapshot());
    const newOwner = newStore.createOwner()!;
    newOwner.replaceLayer(scope, 'layer', [highlight('new')]);
    expect(liveOwner.replaceLayer(scope, 'layer', [highlight('late')])).toEqual({ status: 'disposed' });
    expect(liveOwner.upsertEntries(scope, 'layer', [highlight('late')])).toEqual({ status: 'disposed' });
    expect(liveOwner.removeEntries(scope, 'layer', ['live'])).toEqual({ status: 'disposed' });
    expect(liveOwner.clearLayer(scope, 'layer')).toEqual({ status: 'disposed' });
    liveOwner.dispose();
    expect(store.createOwner()).toBeUndefined();
    expect(store.getLayers()).toEqual([]);
    expect(newStore.getLayers()).toEqual([
      { ownerId: newOwner.ownerId, layerId: 'layer', entries: [highlight('new')] },
    ]);
  });
});

describe('overlay store subscriptions', () => {
  it('publishes a stable immutable snapshot after each atomic change', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    const empty = store.getSnapshot();
    expect(store.getSnapshot()).toBe(empty);
    const seen: unknown[] = [];
    store.subscribe(() => seen.push(store.getSnapshot()));
    const input = annotation();
    owner.replaceLayer(scope, 'layer', [highlight('step'), input]);
    const first = store.getSnapshot();
    expect(first).not.toBe(empty);
    expect(store.getSnapshot()).toBe(first);
    expect(seen).toEqual([first]);
    const note = first[0].entries[1];
    expect(Reflect.set(first[0], 'ownerId', 'tampered')).toBe(false);
    expect(Reflect.set(first[0].entries, '0', input)).toBe(false);
    expect(Reflect.set(note, 'text', 'tampered')).toBe(false);
    expect(Reflect.set(note.target, 'id', 'tampered')).toBe(false);
    if (note.kind !== 'annotation') throw new Error('Expected annotation');
    expect(Reflect.set(note.interaction, 'tooltip', 'tampered')).toBe(false);
    input.value = 7;
    input.interaction.tooltip = 'Updated';
    owner.upsertEntries(scope, 'layer', [input]);
    expect(store.getSnapshot()).not.toBe(first);
    expect(note.value).toBe(0);
    expect(note.interaction.tooltip).toBe('Route count');
    expect(seen).toHaveLength(2);
    expect(store.getLayers()).toEqual(store.getSnapshot());
  });

  it('does not notify or replace the snapshot for rejected or unchanged writes', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    owner.replaceLayer(scope, 'layer', [highlight('step'), annotation()]);
    const before = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    store.createOwner()!.dispose();
    owner.replaceLayer(scope, 'layer', [highlight('step'), annotation()]);
    owner.upsertEntries(scope, 'layer', [annotation()]);
    owner.upsertEntries(scope, 'layer', []);
    owner.upsertEntries(scope, 'layer', [highlight('missing', 'absent')]);
    owner.removeEntries(scope, 'layer', ['absent']);
    owner.clearLayer(scope, 'absent');
    owner.replaceLayer({ ...scope, modelRevision: 'stale' }, 'layer', []);
    owner.replaceLayer(scope, 'layer', [highlight('duplicate'), highlight('duplicate')]);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);
  });

  it('notifies for unresolved replacements, removals, layer clearing and owner disposal', () => {
    const store = createOverlayLayerStore(snapshot());
    const first = store.createOwner()!;
    const second = store.createOwner()!;
    first.replaceLayer(scope, 'layer', [highlight('step'), annotation()]);
    second.replaceLayer(scope, 'layer', [highlight('other')]);
    const sizes: number[] = [];
    store.subscribe(() => sizes.push(store.getSnapshot().flatMap((layer) => layer.entries).length));
    first.upsertEntries(scope, 'layer', [highlight('step', 'absent')]);
    first.removeEntries(scope, 'layer', ['annotation']);
    second.clearLayer(scope, 'layer');
    second.replaceLayer(scope, 'layer', [annotation()]);
    second.dispose();
    second.dispose();
    expect(sizes).toEqual([2, 1, 0, 1, 0]);
  });

  it('treats changed ordering and annotation metadata as snapshot changes', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    owner.replaceLayer(scope, 'layer', [highlight('step'), annotation()]);
    const listener = vi.fn();
    store.subscribe(listener);
    owner.replaceLayer(scope, 'layer', [annotation(), highlight('step')]);
    owner.upsertEntries(scope, 'layer', [{ ...annotation(), interaction: { accessibleLabel: 'New label' } }]);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()[0].entries.map(({ id }) => id)).toEqual(['annotation', 'step']);
  });

  it('unsubscribes independently and does not retain listeners after disposal', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const unsubscribeAgain = store.subscribe(listener);
    unsubscribe();
    unsubscribe();
    owner.replaceLayer(scope, 'layer', [annotation()]);
    expect(listener).toHaveBeenCalledTimes(1);
    store.dispose();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual([]);
    const empty = store.getSnapshot();
    store.dispose();
    unsubscribeAgain();
    const lateUnsubscribe = store.subscribe(listener);
    owner.replaceLayer(scope, 'layer', [annotation()]);
    lateUnsubscribe();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toBe(empty);
  });

  it('supports a listener disposing the store while another listener reads the final snapshot', () => {
    const store = createOverlayLayerStore(snapshot());
    const owner = store.createOwner()!;
    store.subscribe(() => {
      store.dispose();
    });
    const read = vi.fn(() => {
      expect(store.getSnapshot()).toEqual([]);
    });
    store.subscribe(read);
    owner.replaceLayer(scope, 'layer', [annotation()]);
    expect(read).toHaveBeenCalledOnce();
    expect(store.createOwner()).toBeUndefined();
  });

  it('notifies remaining listeners even when one throws, reporting the error asynchronously', () => {
    const queue = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => undefined);
    try {
      const store = createOverlayLayerStore(snapshot());
      const error = new Error('Listener failed');
      store.subscribe(() => {
        throw error;
      });
      const listener = vi.fn();
      store.subscribe(listener);
      expect(store.createOwner()!.replaceLayer(scope, 'layer', [annotation()]).status).toBe('applied');
      expect(listener).toHaveBeenCalledOnce();
      expect(queue).toHaveBeenCalledOnce();
      expect(() => {
        queue.mock.calls[0][0]();
      }).toThrow(error);
    } finally {
      queue.mockRestore();
    }
  });
});
