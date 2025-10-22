import { IVisualizationNode } from '../../../../models';
import {
  IInteractionType,
  IModalCustomization,
  IRegisteredInteractionAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { IClipboardCopyObject } from '../../../../models/visualization/clipboard';

export const processOnDeleteAddonRecursively = (
  parentVizNode: IVisualizationNode,
  modalAnswer: string | undefined,
  getAddons: (vizNode: IVisualizationNode) => IRegisteredInteractionAddon<IInteractionType.ON_DELETE>[],
) => {
  const vizNodeChildren = parentVizNode.getChildren() || [];
  for (const child of vizNodeChildren) {
    processOnDeleteAddonRecursively(child, modalAnswer, getAddons);
  }

  for (const addon of getAddons(parentVizNode)) {
    addon.callback(parentVizNode, modalAnswer);
  }
};

export const findOnDeleteModalCustomizationRecursively = (
  parentVizNode: IVisualizationNode,
  getAddons: (vizNode: IVisualizationNode) => IRegisteredInteractionAddon<IInteractionType.ON_DELETE>[],
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
 * This is supposed to process "Copy" interaction addons recursively, but is not yet implemented.
 * Currently, it only applies to the parent {@link IVisualizationNode} which is passed-in as a 1st argument.
 * In order to implement  recursive processing, we need to merge {@link IClipboardCopyObject} from children
 * into the parent one.
 * @param parentVizNode
 * @param content
 * @param getAddons
 */
export const processOnCopyAddonRecursively = (
  parentVizNode: IVisualizationNode,
  content: IClipboardCopyObject | undefined,
  getAddons: (vizNode: IVisualizationNode) => IRegisteredInteractionAddon<IInteractionType.ON_COPY>[],
): IClipboardCopyObject | undefined => {
  let processedContent = content;

  /* TODO merge updated children into the parent IClipboardCopyObject to apply copy addons recursively
    const vizNodeChildren = parentVizNode.getChildren() || [];
    const copiedChildren: (IClipboardCopyObject | undefined)[] = [];
    for (const child of vizNodeChildren) {
      let copied = child.getCopiedContent();
      copied = processOnCopyAddonRecursively(child, copied, getAddons);
      copiedChildren.push(copied);
    }
    // merge "copiedChildren" into "content"
  */

  for (const addon of getAddons(parentVizNode)) {
    processedContent = addon.callback(parentVizNode, processedContent);
  }

  return processedContent;
};
