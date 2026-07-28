import { FromDefinition, ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CamelUriHelper } from '../../../../../utils';
import { isCamelRoute } from '../../../../../utils/is-camel-route';
import { isKameletDefinition } from '../../../../../utils/is-kamelet-definition';
import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelRouteVisualEntityData, ICamelElementLookupResult } from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { BaseNodeMapper } from './base-node-mapper';

export class FromNodeMapper extends BaseNodeMapper {
  async getVizNodeFromProcessor(
    path: string,
    _componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const processorName: keyof ProcessorDefinition = 'from' as keyof ProcessorDefinition;

    // Extract component/kamelet information first to determine the node name
    let componentName: string | undefined;
    let kameletName: string | undefined;

    const fromDefinition = this.getFromDefinition(entityDefinition);
    if (fromDefinition?.uri) {
      const names = CamelUriHelper.getComponentAndKameletName(fromDefinition.uri);
      componentName = names.componentName;
      if ('kameletName' in names) {
        kameletName = names.kameletName;
      }
    }

    const data: CamelRouteVisualEntityData = {
      name: kameletName || componentName || processorName,
      path,
      processorName,
      componentName,
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

    /** Enrich the node*/
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, CatalogKind.Entity);

    const stepNodes = await this.getChildrenFromBranch(`${path}.steps`, entityDefinition);
    stepNodes.forEach((stepNode) => {
      vizNode.addChild(stepNode);
    });

    return vizNode;
  }

  private getFromDefinition(entityDefinition: unknown): FromDefinition | undefined {
    if (isCamelRoute(entityDefinition)) {
      return entityDefinition.route.from;
    }

    if (isKameletDefinition(entityDefinition)) {
      return entityDefinition.spec.template.from;
    }

    return undefined;
  }
}
