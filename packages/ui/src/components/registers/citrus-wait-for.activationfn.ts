import { CatalogKind } from '../../models/catalog-kind';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';

export const CITRUS_WAIT_FOR_ACTION_NAME = 'waitFor';

export const citrusWaitForActivationFn = (vizNode?: IVisualizationNode): boolean => {
  if (!vizNode) {
    return false;
  }

  const primaryNodeId = vizNode.data.primaryNodeId;

  return primaryNodeId?.name === CITRUS_WAIT_FOR_ACTION_NAME && primaryNodeId.catalogKind === CatalogKind.TestAction;
};
