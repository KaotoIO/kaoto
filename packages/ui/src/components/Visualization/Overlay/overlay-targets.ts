/** Internal model references, valid only within the supplied scope; not persistent runtime IDs. */
export interface OverlayTarget {
  kind: 'node' | 'edge' | 'route';
  id: string;
}

export interface OverlayScope {
  canvasId: string;
  documentId: string;
  modelRevision: string;
}

export interface OverlayTargetSnapshot {
  scope: OverlayScope;
  targets: readonly OverlayTarget[];
}

export type OverlayTargetResolution =
  | { status: 'resolved'; target: OverlayTarget }
  | { status: 'missing' | 'ambiguous' | 'stale' };

export interface OverlayTargetIndex {
  list(): readonly OverlayTarget[];
  resolve(scope: OverlayScope, target: OverlayTarget): OverlayTargetResolution;
}

/** Snapshot exact identities, retaining collisions so they cannot silently bind to the wrong element. */
export function createOverlayTargetIndex(snapshot: OverlayTargetSnapshot): OverlayTargetIndex {
  const scope = { ...snapshot.scope };
  const countsByKind = new Map<OverlayTarget['kind'], Map<string, number>>();

  for (const { kind, id } of snapshot.targets) {
    let counts = countsByKind.get(kind);
    if (!counts) {
      counts = new Map();
      countsByKind.set(kind, counts);
    }
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return {
    list() {
      const targets: OverlayTarget[] = [];
      countsByKind.forEach((counts, kind) => {
        counts.forEach((count, id) => {
          if (count === 1) targets.push({ kind, id });
        });
      });
      return targets;
    },
    resolve(requestScope, { kind, id }) {
      if (
        requestScope.canvasId !== scope.canvasId ||
        requestScope.documentId !== scope.documentId ||
        requestScope.modelRevision !== scope.modelRevision
      ) {
        return { status: 'stale' };
      }

      const count = countsByKind.get(kind)?.get(id) ?? 0;
      if (count === 0) return { status: 'missing' };
      if (count > 1) return { status: 'ambiguous' };
      return { status: 'resolved', target: { kind, id } };
    },
  };
}
