import { IVisualizationNode } from '../../../../models';
import { IRegisteredInteractionAddon } from '../../../registers/interactions/node-interaction-addon.model';

export const processNodeInteractionAddonRecursively = (
  parentVizNode: IVisualizationNode,
  getAddons: (vizNode: IVisualizationNode) => IRegisteredInteractionAddon[],
) => {
  parentVizNode.getChildren()?.forEach((child) => {
    processNodeInteractionAddonRecursively(child, getAddons);
  });
  getAddons(parentVizNode).forEach((addon) => {
    addon.callback(parentVizNode);
  });
};
