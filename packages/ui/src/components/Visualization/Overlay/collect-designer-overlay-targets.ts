import { EntityType } from '../../../models/entities';
import type { BaseVisualEntity, IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { buildDesignerCanvasModel } from '../designer-canvas-model';
import { collectDesignerModelTargets } from './designer-overlay-targets';
import type { OverlayTarget } from './overlay-targets';

/**
 * Resolve every supplied entity, including routes omitted from the current view.
 * The owner must invalidate in-flight work when entity contents change; entities are not deep-cloned.
 */
export async function collectDesignerOverlayTargets(
  entities: readonly BaseVisualEntity[],
  signal: AbortSignal,
): Promise<readonly OverlayTarget[]> {
  signal.throwIfAborted();
  const inputs = [...entities];
  const routes = inputs.filter(({ type }) => type === EntityType.Route).map(({ id }) => ({ id }));
  const vizNodes: IVisualizationNode[] = [];

  // Convert sequentially so cancellation prevents starting the remaining entities.
  await inputs.reduce(async (previous, entity) => {
    await previous;
    signal.throwIfAborted();
    const vizNode = await entity.toVizNode();
    signal.throwIfAborted();
    vizNodes.push(vizNode);
  }, Promise.resolve());

  signal.throwIfAborted();
  return collectDesignerModelTargets(buildDesignerCanvasModel(vizNodes), routes);
}
