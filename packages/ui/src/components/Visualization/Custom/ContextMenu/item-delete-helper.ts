import { IVisualizationNode } from '../../../../models';
import {
  IModalCustomization,
  IRegisteredInteractionAddon,
} from '../../../registers/interactions/node-interaction-addon.model';

export const processNodeInteractionAddonRecursively = (
  parentVizNode: IVisualizationNode,
  modalAnswer: string | undefined,
  getAddons: (vizNode: IVisualizationNode) => IRegisteredInteractionAddon[],
) => {
  parentVizNode.getChildren()?.forEach((child) => {
    processNodeInteractionAddonRecursively(child, modalAnswer, getAddons);
  });
  getAddons(parentVizNode).forEach((addon) => {
    addon.callback(parentVizNode, modalAnswer);
  });
};

export const findModalCustomizationRecursively = (
  parentVizNode: IVisualizationNode,
  getAddons: (vizNode: IVisualizationNode) => IRegisteredInteractionAddon[],
) => {
  const modalCustomizations: IModalCustomization[] = [];
  // going breadth-first while addon processes depth-first... do we want?
  getAddons(parentVizNode).forEach((addon) => {
    if (addon.modalCustomization && !modalCustomizations.includes(addon.modalCustomization)) {
      modalCustomizations.push(addon.modalCustomization);
    }
  });
  parentVizNode.getChildren()?.forEach((child) => {
    findModalCustomizationRecursively(child, getAddons).forEach((custom) => {
      if (!modalCustomizations.includes(custom)) {
        modalCustomizations.push(custom);
      }
    });
  });
  return modalCustomizations;
};
