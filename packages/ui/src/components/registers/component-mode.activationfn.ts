import { IVisualizationNode } from '../../models/visualization/base-visual-entity';

export const componentModeActivationFn = (vizNode?: IVisualizationNode): boolean => {
  if (!vizNode) {
    return false;
  }

  return (
    vizNode.data.primaryNodeId?.name === 'to' ||
    vizNode.data.primaryNodeId?.name === 'toD' ||
    vizNode.data.primaryNodeId?.name === 'poll'
  );
};
