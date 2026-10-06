import type { CanvasNodesAndEdges } from '../Canvas/canvas.models';
import type { OverlayScope, OverlayTarget, OverlayTargetSnapshot } from './overlay-targets';

/**
 * Extract identities from a complete logical model, independently of mounted SVG or collapse state.
 * The caller supplies actual route entities and owns the model revision; visible-only models cannot
 * provide full target discovery. References are intentionally not persistent across source reparsing.
 */
export function buildDesignerOverlayTargetSnapshot(
  scope: OverlayScope,
  model: CanvasNodesAndEdges,
  routes: readonly { id: string }[],
): OverlayTargetSnapshot {
  return { scope: { ...scope }, targets: collectDesignerModelTargets(model, routes) };
}

/** Extract exact references without assigning a session scope or deduplicating ambiguous identities. */
export function collectDesignerModelTargets(
  model: CanvasNodesAndEdges,
  routes: readonly { id: string }[],
): readonly OverlayTarget[] {
  const nodes = model.nodes.filter((node) => !node.data?.vizNode?.data.isPlaceholder);
  const nodeIds = new Set(nodes.map(({ id }) => id));
  const targets: OverlayTarget[] = nodes.map(({ id }) => ({ kind: 'node', id }));

  for (const { id, source, target } of model.edges) {
    if (nodeIds.has(source) && nodeIds.has(target)) targets.push({ kind: 'edge', id });
  }
  for (const { id } of routes) {
    targets.push({ kind: 'route', id });
  }

  return targets;
}
