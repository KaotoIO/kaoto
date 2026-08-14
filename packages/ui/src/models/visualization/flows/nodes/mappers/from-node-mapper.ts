import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { safeGetValue } from '@kaoto/forms';

import { CamelUriHelper } from '../../../../../utils';
import { isFromDefinition } from '../../../../../utils/is-from-definition';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode, IVisualizationNodeData, IVisualizationNodeIds } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { BaseNodeMapper } from './base-node-mapper';

export class FromNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName: keyof ProcessorDefinition = 'from' as keyof ProcessorDefinition;

    // Extract component/kamelet information first to determine the node name
    let componentName: string | undefined;
    let kameletName: string | undefined;

    const fromDefinition = safeGetValue(entityDefinition, path);
    if (isFromDefinition(fromDefinition)) {
      const names = CamelUriHelper.getComponentAndKameletName(fromDefinition.uri);
      componentName = names.componentName;
      if ('kameletName' in names) {
        kameletName = names.kameletName;
      }
    }

    const data: IVisualizationNodeData = {
      name: kameletName || componentName || processorName,
      path,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Entity } satisfies NodeIdentity,
    };

    const vizNode = createVisualizationNode(path, data);

    if (componentName) {
      vizNode.data.secondaryNodeId = { catalogKind: CatalogKind.Component, name: componentName };
    }
    if (kameletName) {
      vizNode.data.tertiaryNodeId = { catalogKind: CatalogKind.Kamelet, name: kameletName };
    }

    const stepNodes = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    stepNodes.forEach((stepNode) => {
      vizNode.addChild(stepNode);
    });

    return vizNode;
  }
}
