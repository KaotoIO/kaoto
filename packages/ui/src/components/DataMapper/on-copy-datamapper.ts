import { IVisualizationNode } from '../../models';
import { IClipboardCopyObject } from '../../models/visualization/clipboard';

export const onCopyDataMapper = (
  _sourceVizNode: IVisualizationNode,
  content: IClipboardCopyObject | undefined,
): IClipboardCopyObject | undefined => {
  if (!content) return undefined;

  if (content.name === 'kaoto-datamapper') {
    return {
      ...content,
      name: 'step',
    };
  }

  return content;
};
