import { v4 as uuidv4 } from 'uuid';

import {
  createOverlayTargetIndex,
  OverlayScope,
  OverlayTarget,
  OverlayTargetIndex,
  OverlayTargetResolution,
} from './overlay-targets';

export type OverlayTargetLoader = (signal: AbortSignal) => Promise<readonly OverlayTarget[]>;
export type OverlayTargetSessionState =
  | { status: 'idle' | 'disposed' }
  | { status: 'loading' | 'ready'; scope: OverlayScope }
  | { status: 'error'; scope: OverlayScope; message: string };
export type OverlayTargetRefreshResult = 'applied' | 'superseded' | 'failed' | 'disposed';
export type OverlaySessionResolution = OverlayTargetResolution | { status: 'unavailable' | 'disposed' };

export interface OverlayTargetSession {
  getState(): OverlayTargetSessionState;
  refresh(documentId: string, load: OverlayTargetLoader): Promise<OverlayTargetRefreshResult>;
  list(): readonly OverlayTarget[];
  resolve(scope: OverlayScope, target: OverlayTarget): OverlaySessionResolution;
  dispose(): void;
}

/**
 * Owns one canvas's logical target lifetime. Refresh on semantic model changes, not layout changes.
 * The caller must invalidate before reusing edited entities and supply the corresponding complete model.
 */
export function createOverlayTargetSession(): OverlayTargetSession {
  const canvasId = uuidv4();
  let state: OverlayTargetSessionState = { status: 'idle' };
  let index: OverlayTargetIndex | undefined;
  let activeController: AbortController | undefined;
  let disposed = false;

  const inactiveResult = (controller: AbortController): 'disposed' | 'superseded' | undefined => {
    if (disposed) return 'disposed';
    if (controller !== activeController) return 'superseded';
    return undefined;
  };

  return {
    getState() {
      return 'scope' in state ? { ...state, scope: { ...state.scope } } : { ...state };
    },
    async refresh(documentId, load) {
      if (disposed) return 'disposed';
      const previousController = activeController;
      const controller = new AbortController();
      const scope: OverlayScope = { canvasId, documentId, modelRevision: uuidv4() };
      activeController = controller;
      index = undefined;
      state = { status: 'loading', scope };
      previousController?.abort();

      // Abort handlers may themselves refresh or dispose this session synchronously.
      const interrupted = inactiveResult(controller);
      if (interrupted) return interrupted;

      try {
        const targets = await load(controller.signal);
        const obsolete = inactiveResult(controller);
        if (obsolete) return obsolete;
        index = createOverlayTargetIndex({ scope, targets });
        state = { status: 'ready', scope };
        return 'applied';
      } catch (error) {
        const obsolete = inactiveResult(controller);
        if (obsolete) return obsolete;
        state = {
          status: 'error',
          scope,
          message: error instanceof Error ? error.message : 'Failed to resolve overlay targets',
        };
        return 'failed';
      }
    },
    list() {
      return index?.list() ?? [];
    },
    resolve(scope, target) {
      if (disposed) return { status: 'disposed' };
      if (!('scope' in state)) return { status: 'unavailable' };
      if (
        scope.canvasId !== state.scope.canvasId ||
        scope.documentId !== state.scope.documentId ||
        scope.modelRevision !== state.scope.modelRevision
      ) {
        return { status: 'stale' };
      }
      return index?.resolve(scope, target) ?? { status: 'unavailable' };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      index = undefined;
      state = { status: 'disposed' };
      const controller = activeController;
      activeController = undefined;
      controller?.abort();
    },
  };
}
