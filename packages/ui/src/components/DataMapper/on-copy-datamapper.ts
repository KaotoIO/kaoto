import { IVisualizationNode } from '../../models';
import { IClipboardCopyObject } from '../../models/visualization/clipboard';

export const onCopyDataMapper = (parameters: {
  sourceVizNode: IVisualizationNode;
  content: IClipboardCopyObject | undefined;
}): IClipboardCopyObject | undefined => {
  if (!parameters.content) return undefined;

  if (parameters.content.name === 'kaoto-datamapper') {
    return {
      ...parameters.content,
      name: 'step',
    };
  }

  return parameters.content;
};
