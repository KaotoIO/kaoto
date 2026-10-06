import { createOverlayTargetIndex, OverlayScope, OverlayTarget } from './overlay-targets';

const scope: OverlayScope = { canvasId: 'canvas-1', documentId: 'routes.yaml', modelRevision: 'revision-1' };

describe('createOverlayTargetIndex', () => {
  it('resolves exact identities independently for each target kind', () => {
    const targets: OverlayTarget[] = [
      { kind: 'node', id: 'shared' },
      { kind: 'edge', id: 'shared' },
      { kind: 'route', id: 'shared' },
    ];
    const index = createOverlayTargetIndex({ scope, targets });

    for (const target of targets) {
      expect(index.resolve(scope, target)).toEqual({ status: 'resolved', target });
    }
    expect(index.list()).toEqual(expect.arrayContaining(targets));
    expect(index.list()).toHaveLength(3);
  });

  it('does not match a different kind, partial ID, or similarly named target', () => {
    const index = createOverlayTargetIndex({ scope, targets: [{ kind: 'node', id: 'route-1|log-1' }] });

    expect(index.resolve(scope, { kind: 'route', id: 'route-1|log-1' })).toEqual({ status: 'missing' });
    expect(index.resolve(scope, { kind: 'node', id: 'log-1' })).toEqual({ status: 'missing' });
    expect(index.resolve(scope, { kind: 'node', id: 'route-2|log-1' })).toEqual({ status: 'missing' });
  });

  it.each(['node', 'edge', 'route'] as const)(
    'reports duplicate %s identities and omits them from discovery',
    (kind) => {
      const target: OverlayTarget = { kind, id: 'duplicate' };
      const unique: OverlayTarget = { kind, id: 'unique' };
      const index = createOverlayTargetIndex({ scope, targets: [target, unique, { ...target }, { ...target }] });

      expect(index.resolve(scope, target)).toEqual({ status: 'ambiguous' });
      expect(index.list()).toEqual([unique]);
      expect(index.resolve(scope, unique)).toEqual({ status: 'resolved', target: unique });
    },
  );

  it.each<keyof OverlayScope>(['canvasId', 'documentId', 'modelRevision'])(
    'rejects a different %s before attempting target resolution',
    (key) => {
      const target: OverlayTarget = { kind: 'node', id: 'node-1' };
      const index = createOverlayTargetIndex({ scope, targets: [target] });
      const staleScope = { ...scope, [key]: 'other' };

      expect(index.resolve(staleScope, target)).toEqual({ status: 'stale' });
      expect(index.resolve(staleScope, { kind: 'node', id: 'missing' })).toEqual({ status: 'stale' });
      expect(index.resolve({ ...scope }, target)).toEqual({ status: 'resolved', target });
    },
  );

  it('handles an empty model without manufacturing targets', () => {
    const index = createOverlayTargetIndex({ scope, targets: [] });

    expect(index.list()).toEqual([]);
    expect(index.resolve(scope, { kind: 'route', id: 'route-1' })).toEqual({ status: 'missing' });
  });

  it('treats IDs as opaque strings, including separators and object property names', () => {
    const targets: OverlayTarget[] = [
      { kind: 'node', id: '__proto__' },
      { kind: 'edge', id: 'a|b >>> c|d' },
      { kind: 'route', id: 'constructor' },
    ];
    const index = createOverlayTargetIndex({ scope, targets });

    for (const target of targets) {
      expect(index.resolve(scope, target)).toEqual({ status: 'resolved', target });
    }
  });

  it('keeps its snapshot when input scope, target records, and arrays are later mutated', () => {
    const inputScope = { ...scope };
    const targets: OverlayTarget[] = [{ kind: 'node', id: 'original' }];
    const index = createOverlayTargetIndex({ scope: inputScope, targets });
    inputScope.modelRevision = 'new-revision';
    targets[0].id = 'changed';
    targets.push({ kind: 'node', id: 'added' });

    expect(index.list()).toEqual([{ kind: 'node', id: 'original' }]);
    expect(index.resolve(scope, { kind: 'node', id: 'original' })).toEqual({
      status: 'resolved',
      target: { kind: 'node', id: 'original' },
    });
    expect(index.resolve(inputScope, { kind: 'node', id: 'original' })).toEqual({ status: 'stale' });
  });

  it('does not expose mutable records through discovery or resolution', () => {
    const target: OverlayTarget = { kind: 'node', id: 'original' };
    const index = createOverlayTargetIndex({ scope, targets: [target] });
    index.list()[0].id = 'discovery-mutation';
    const result = index.resolve(scope, target);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') result.target.id = 'resolution-mutation';

    expect(index.list()).toEqual([{ kind: 'node', id: 'original' }]);
    expect(index.resolve(scope, { kind: 'node', id: 'original' })).toEqual({
      status: 'resolved',
      target: { kind: 'node', id: 'original' },
    });
    expect(target.id).toBe('original');
  });
});
