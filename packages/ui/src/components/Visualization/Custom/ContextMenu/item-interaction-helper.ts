import { IVisualizationNode } from '../../../../models';
import {
  IModalCustomization,
  IOnCopyAddon,
  IOnDeleteAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { IClipboardCopyObject } from '../../../../models/visualization/clipboard';

export const processOnDeleteAddonRecursively = (
  parentVizNode: IVisualizationNode,
  modalAnswer: string | undefined,
  getAddons: (vizNode: IVisualizationNode) => IOnDeleteAddon[],
) => {
  const vizNodeChildren = parentVizNode.getChildren() || [];
  for (const child of vizNodeChildren) {
    processOnDeleteAddonRecursively(child, modalAnswer, getAddons);
  }

  for (const addon of getAddons(parentVizNode)) {
    addon.callback({ vizNode: parentVizNode, modalAnswer: modalAnswer });
  }
};

export const findOnDeleteModalCustomizationRecursively = (
  parentVizNode: IVisualizationNode,
  getAddons: (vizNode: IVisualizationNode) => IOnDeleteAddon[],
) => {
  const modalCustomizations: IModalCustomization[] = [];
  // going breadth-first while addon processes depth-first... do we want?
  for (const addon of getAddons(parentVizNode)) {
    if (addon.modalCustomization && !modalCustomizations.includes(addon.modalCustomization)) {
      modalCustomizations.push(addon.modalCustomization);
    }
  }

  const vizNodeChildren = parentVizNode.getChildren() || [];
  for (const child of vizNodeChildren) {
    for (const custom of findOnDeleteModalCustomizationRecursively(child, getAddons)) {
      if (!modalCustomizations.includes(custom)) {
        modalCustomizations.push(custom);
      }
    }
  }
  return modalCustomizations;
};

/**
 * Process ON_COPY addons on the passed in visualization node.
 * @param parentVizNode
 * @param content
 * @param getAddons
 */
export const processOnCopyAddon = (
  parentVizNode: IVisualizationNode,
  content: IClipboardCopyObject | undefined,
  getAddons: (vizNode: IVisualizationNode) => IOnCopyAddon[],
): IClipboardCopyObject | undefined => {
  let processedContent = content;

  for (const addon of getAddons(parentVizNode)) {
    processedContent = addon.callback({ sourceVizNode: parentVizNode, content: processedContent });
  }

  return processedContent;
};
