import { createOverlayTargetSession, OverlayTargetSession } from './overlay-target-session';
import { OverlayScope, OverlayTarget } from './overlay-targets';

const target: OverlayTarget = { kind: 'node', id: 'route|log' };
const other: OverlayTarget = { kind: 'route', id: 'other' };

function deferred() {
  let resolve!: (targets: readonly OverlayTarget[]) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<readonly OverlayTarget[]>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function getScope(session: OverlayTargetSession): OverlayScope {
  const state = session.getState();
  if (!('scope' in state)) throw new Error('Expected an active scope');
  return state.scope;
}

describe('createOverlayTargetSession', () => {
  it('starts without usable targets and publishes a ready snapshot', async () => {
    const session = createOverlayTargetSession();
    expect(session.getState()).toEqual({ status: 'idle' });
    expect(session.list()).toEqual([]);
    expect(session.resolve({ canvasId: '', documentId: '', modelRevision: '' }, target)).toEqual({
      status: 'unavailable',
    });

    expect(await session.refresh('routes.yaml', async () => [target])).toBe('applied');
    const scope = getScope(session);
    expect(session.getState()).toEqual({ status: 'ready', scope });
    expect(scope.documentId).toBe('routes.yaml');
    expect(session.resolve(scope, target)).toEqual({ status: 'resolved', target });
    expect(session.resolve(scope, other)).toEqual({ status: 'missing' });
  });

  it('invalidates immediately even when refreshing the same document', async () => {
    const session = createOverlayTargetSession();
    await session.refresh('routes.yaml', async () => [target]);
    const oldScope = getScope(session);
    const load = deferred();
    const refresh = session.refresh('routes.yaml', () => load.promise);
    const currentScope = getScope(session);

    expect(currentScope.canvasId).toBe(oldScope.canvasId);
    expect(currentScope.modelRevision).not.toBe(oldScope.modelRevision);
    expect(session.getState().status).toBe('loading');
    expect(session.list()).toEqual([]);
    expect(session.resolve(oldScope, target)).toEqual({ status: 'stale' });
    expect(session.resolve(currentScope, target)).toEqual({ status: 'unavailable' });
    load.resolve([other]);
    expect(await refresh).toBe('applied');
    expect(session.list()).toEqual([other]);
  });

  it.each(['success', 'failure'] as const)(
    'ignores an obsolete %s after a newer document becomes ready',
    async (outcome) => {
      const session = createOverlayTargetSession();
      const oldLoad = deferred();
      let oldSignal!: AbortSignal;
      const oldRefresh = session.refresh('old.yaml', (signal) => {
        oldSignal = signal;
        return oldLoad.promise;
      });
      const oldScope = getScope(session);
      await session.refresh('new.yaml', async () => [other]);
      const newScope = getScope(session);
      expect(oldSignal.aborted).toBe(true);
      if (outcome === 'success') oldLoad.resolve([target]);
      else oldLoad.reject(new Error('obsolete failure'));

      expect(await oldRefresh).toBe('superseded');
      expect(session.getState()).toEqual({ status: 'ready', scope: newScope });
      expect(session.list()).toEqual([other]);
      expect(session.resolve(oldScope, target)).toEqual({ status: 'stale' });
    },
  );

  it('keeps different sessions isolated when reopening the same document', async () => {
    const previous = createOverlayTargetSession();
    await previous.refresh('same.yaml', async () => [target]);
    const previousScope = getScope(previous);
    previous.dispose();
    const next = createOverlayTargetSession();
    await next.refresh('same.yaml', async () => [target]);

    expect(getScope(next).canvasId).not.toBe(previousScope.canvasId);
    expect(next.resolve(previousScope, target)).toEqual({ status: 'stale' });
  });

  it('preserves a newer refresh started by a synchronous abort listener', async () => {
    const session = createOverlayTargetSession();
    const initialLoad = deferred();
    const latestLoad = deferred();
    let latestRefresh: ReturnType<OverlayTargetSession['refresh']> | undefined;
    const initialRefresh = session.refresh('initial.yaml', (signal) => {
      signal.addEventListener('abort', () => {
        latestRefresh = session.refresh('latest.yaml', () => latestLoad.promise);
      });
      return initialLoad.promise;
    });
    const initialScope = getScope(session);
    const interruptedLoader = vi.fn(async () => [target]);

    const interruptedRefresh = session.refresh('interrupted.yaml', interruptedLoader);
    const latestScope = getScope(session);

    expect(latestScope.documentId).toBe('latest.yaml');
    expect(session.getState()).toEqual({ status: 'loading', scope: latestScope });
    expect(session.list()).toEqual([]);
    expect(session.resolve(initialScope, target)).toEqual({ status: 'stale' });
    expect(await interruptedRefresh).toBe('superseded');
    expect(interruptedLoader).not.toHaveBeenCalled();

    latestLoad.resolve([other]);
    expect(await latestRefresh).toBe('applied');
    initialLoad.resolve([target]);
    expect(await initialRefresh).toBe('superseded');
    expect(session.getState()).toEqual({ status: 'ready', scope: latestScope });
    expect(session.list()).toEqual([other]);
    expect(session.resolve(latestScope, other)).toEqual({ status: 'resolved', target: other });
  });

  it('does not start a loader after an abort listener disposes the session', async () => {
    const session = createOverlayTargetSession();
    const initialLoad = deferred();
    const initialRefresh = session.refresh('initial.yaml', (signal) => {
      signal.addEventListener('abort', () => {
        session.dispose();
      });
      return initialLoad.promise;
    });
    const initialScope = getScope(session);
    const interruptedLoader = vi.fn(async () => [other]);

    const interruptedRefresh = session.refresh('interrupted.yaml', interruptedLoader);

    expect(session.getState()).toEqual({ status: 'disposed' });
    expect(session.list()).toEqual([]);
    expect(session.resolve(initialScope, target)).toEqual({ status: 'disposed' });
    expect(await interruptedRefresh).toBe('disposed');
    expect(interruptedLoader).not.toHaveBeenCalled();

    initialLoad.reject(new Error('obsolete load failed after disposal'));
    expect(await initialRefresh).toBe('disposed');
    expect(session.getState()).toEqual({ status: 'disposed' });
    expect(session.list()).toEqual([]);
  });

  it.each(['throw', 'reject'] as const)('reports a current loader %s and permits recovery', async (failure) => {
    const session = createOverlayTargetSession();
    await session.refresh('routes.yaml', async () => [target]);
    const oldScope = getScope(session);
    const error = new Error('Cannot build model');
    const result = await session.refresh('routes.yaml', () => {
      if (failure === 'throw') throw error;
      return Promise.reject(error);
    });

    expect(result).toBe('failed');
    expect(session.getState()).toEqual({ status: 'error', scope: getScope(session), message: error.message });
    expect(session.list()).toEqual([]);
    expect(session.resolve(getScope(session), target)).toEqual({ status: 'unavailable' });
    expect(session.resolve(oldScope, target)).toEqual({ status: 'stale' });
    expect(await session.refresh('routes.yaml', async () => [other])).toBe('applied');
    expect(session.list()).toEqual([other]);
  });

  it('handles non-Error rejection values without coercing them', async () => {
    const session = createOverlayTargetSession();
    expect(await session.refresh('routes.yaml', () => Promise.reject(null))).toBe('failed');
    expect(session.getState()).toMatchObject({ status: 'error', message: expect.any(String) });
  });

  it.each(['success', 'failure'] as const)('cannot restore a disposed session through late %s', async (outcome) => {
    const session = createOverlayTargetSession();
    const load = deferred();
    let signal!: AbortSignal;
    const refresh = session.refresh('routes.yaml', (value) => {
      signal = value;
      return load.promise;
    });
    const scope = getScope(session);
    session.dispose();
    session.dispose();
    expect(signal.aborted).toBe(true);
    if (outcome === 'success') load.resolve([target]);
    else load.reject(new Error('late rejection'));

    expect(await refresh).toBe('disposed');
    expect(session.getState()).toEqual({ status: 'disposed' });
    expect(session.list()).toEqual([]);
    expect(session.resolve(scope, target)).toEqual({ status: 'disposed' });
    const loader = vi.fn(async () => [target]);
    expect(await session.refresh('routes.yaml', loader)).toBe('disposed');
    expect(loader).not.toHaveBeenCalled();
  });

  it('discards an already ready index on disposal', async () => {
    const session = createOverlayTargetSession();
    await session.refresh('routes.yaml', async () => [target]);
    const scope = getScope(session);
    session.dispose();
    expect(session.list()).toEqual([]);
    expect(session.resolve(scope, target)).toEqual({ status: 'disposed' });
  });

  it('keeps scope and target records detached and preserves ambiguity', async () => {
    const session = createOverlayTargetSession();
    const input = [{ ...target }, { ...other }, { ...other }];
    await session.refresh('routes.yaml', async () => input);
    const scope = getScope(session);
    getScope(session).modelRevision = 'mutated';
    input[0].id = 'input mutation';
    session.list()[0].id = 'list mutation';
    const result = session.resolve(scope, target);
    if (result.status === 'resolved') result.target.id = 'resolution mutation';

    expect(session.resolve(scope, target)).toEqual({ status: 'resolved', target });
    expect(session.resolve(scope, other)).toEqual({ status: 'ambiguous' });
    expect(session.list()).toEqual([target]);
  });
});
