import { IVisualizationNode } from '../../models/visualization/base-visual-entity';

export const componentModeActivationFn = (vizNode?: IVisualizationNode): boolean => {
  if (!vizNode) {
    return false;
  }

  return (
    'processorName' in vizNode.data &&
    (vizNode.data.processorName === 'to' ||
      vizNode.data.processorName === 'toD' ||
      vizNode.data.processorName === 'poll')
  );
};
