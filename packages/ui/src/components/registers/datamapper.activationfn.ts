import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { isDataMapperNode } from '../../utils';

export const datamapperActivationFn = (vizNode?: IVisualizationNode): boolean => {
  if (!vizNode) {
    return false;
  }

  const stepDefinition = vizNode.getComponentSchema()?.definition;

  if (!stepDefinition) {
    return false;
  }

  return isDataMapperNode(stepDefinition);
};
