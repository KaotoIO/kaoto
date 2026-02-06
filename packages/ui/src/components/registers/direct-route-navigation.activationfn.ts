import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { IVisualizationNode } from '../../models';
import { DirectRouteNavigationService } from '../../models/camel/direct-route-navigation.service';
import { CamelRouteVisualEntityData } from '../../models/visualization/flows/support/camel-component-types';

export const directRouteNavigationActivationFn = (vizNode: IVisualizationNode): boolean => {
  const nodeData = vizNode.data as CamelRouteVisualEntityData;
  const isDirectToNode = nodeData.processorName === 'to' && nodeData.componentName === 'direct';
  const isDirectFromNode =
    nodeData.processorName === ('from' as keyof ProcessorDefinition) && nodeData.componentName === 'direct';

  if (!isDirectToNode && !isDirectFromNode) {
    return false;
  }

  return DirectRouteNavigationService.getDirectEndpointNameFromDefinition(vizNode.getNodeDefinition()) !== undefined;
};
