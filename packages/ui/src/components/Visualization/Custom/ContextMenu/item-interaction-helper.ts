import { IVisualizationNode } from '../../../../models';
import {
  IModalCustomization,
  IOnCopyAddon,
  IOnDeleteAddon,
  IOnDuplicateAddon,
  IOnPasteAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { IClipboardCopyObject } from '../../../../models/visualization/clipboard';
import { get, set } from 'lodash';

const ARRAY_INDEX_REGEXP = /\.(\d+)/g;

/**
 * Processes the registered addons for the {@link ON_DELETE} interaction being processed for the {@link parentVizNode}.
 * This traverses visualization node children recursively.
 * @param parentVizNode
 * @param modalAnswer
 * @param getAddons
 */
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

/**
 * Collects modal customization requirements from the registered addons for the {@link ON_DELETE} interaction
 * being processed for the {@link parentVizNode}. This traverses visualization node children recursively.
 * @param parentVizNode
 * @param getAddons
 */
export const findOnDeleteModalCustomizationRecursively = (
  parentVizNode: IVisualizationNode,
  getAddons: (vizNode: IVisualizationNode) => IOnDeleteAddon[],
): IModalCustomization[] => {
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

const computeRelativePath = (parentPath: string, childPath: string): string | undefined => {
  if (!childPath.startsWith(parentPath)) return;

  const relativePath = childPath.substring(parentPath.length + 1);
  ARRAY_INDEX_REGEXP.lastIndex = 0;
  return relativePath.replace(ARRAY_INDEX_REGEXP, '[$1]');
};

const processOnDuplicateAddonForChildren = async (
  parentPath: string,
  children: IVisualizationNode[],
  content: IClipboardCopyObject,
  getAddons: (vizNode: IVisualizationNode) => IOnDuplicateAddon[],
) => {
  for (const child of children) {
    const childPath = child.data.path;
    if (!childPath) continue;

    const relativePath = computeRelativePath(parentPath, childPath);
    if (!relativePath) continue;

    const childDefinitionValue = get(content.definition, relativePath);
    if (!childDefinitionValue || typeof childDefinitionValue !== 'object') continue;

    const childContentFromParent = child.getCopiedContent();
    if (!childContentFromParent) continue;

    const childContent: IClipboardCopyObject = {
      ...childContentFromParent,
      definition: childDefinitionValue,
    };

    const transformedChildContent = await processOnDuplicateAddonRecursively(child, childContent, getAddons);

    if (!transformedChildContent) continue;

    set(content.definition, relativePath, transformedChildContent.definition);
  }
};

/**
 * Processes the registered addons for the {@link ON_DUPLICATE} interaction being processed for the {@link parentVizNode}.
 * This traverses visualization node children recursively.
 * @param parentVizNode
 * @param content
 * @param getAddons
 */
export const processOnDuplicateAddonRecursively = async (
  parentVizNode: IVisualizationNode,
  content: IClipboardCopyObject | undefined,
  getAddons: (vizNode: IVisualizationNode) => IOnDuplicateAddon[],
): Promise<IClipboardCopyObject | undefined> => {
  if (!content) return content;

  const children = parentVizNode.getChildren();
  const parentPath = parentVizNode.data.path;
  if (children && parentPath) {
    await processOnDuplicateAddonForChildren(parentPath, children, content, getAddons);
  }

  let result = content;
  for (const addon of getAddons(parentVizNode)) {
    const transformed = await addon.callback({ sourceVizNode: parentVizNode, content: result });
    if (transformed) result = transformed;
  }

  return result;
};

/**
 * Process {@link ON_PASTE} addons on the passed-in clipboard contents. {@link originalContent} is the raw clipboard
 * content that is being pasted, and the {@link updatedContent} is the clipboard content updated with re-generated ID
 * for each steps in order to avoid ID conflicts. We need the original content to identify the metadata associated with
 * the original step ID.
 * This doesn't traverse the clipboard contents by itself. The addons are responsible to find the corresponding step
 * in the clipboard content and act accordingly.
 * @param targetVizNode
 * @param originalContent
 * @param updatedContent
 * @param getAddons
 */
export const processOnPasteAddon = async (
  targetVizNode: IVisualizationNode,
  originalContent: IClipboardCopyObject | undefined,
  updatedContent: IClipboardCopyObject | undefined,
  getAddons: () => IOnPasteAddon[],
): Promise<void> => {
  for (const addon of getAddons()) {
    await addon.callback({
      targetVizNode,
      originalContent,
      updatedContent,
    });
  }
};
