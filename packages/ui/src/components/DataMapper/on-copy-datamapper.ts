import { IVisualizationNode } from '../../models';
import { IClipboardContent } from '../../models/visualization/clipboard';

export const onCopyDataMapper = (parameters: {
  sourceVizNode: IVisualizationNode;
  content: IClipboardContent | undefined;
}): IClipboardContent | undefined => {
  if (!parameters.content) return undefined;

  if (parameters.content.name === 'kaoto-datamapper') {
    return {
      ...parameters.content,
      name: 'step',
    };
  }

  return parameters.content;
};
