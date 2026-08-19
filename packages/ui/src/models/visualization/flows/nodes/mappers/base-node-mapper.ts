import { DoCatch, ProcessorDefinition, When1 } from '@kaoto/camel-catalog/types';
import { safeGetValue } from '@kaoto/forms';

import { CamelUriHelper, getValue } from '../../../../../utils';
import { CatalogKind } from '../../../../catalog-kind';
import { PlaceholderType } from '../../../../placeholder.constants';
import { SPECIAL_PROCESSORS_PARENTS_MAP } from '../../../../special-processors.constants';
import { IVisualizationNode, IVisualizationNodeData, IVisualizationNodeIds } from '../../../base-visual-entity';
import { NodeIdentity } from '../../../node-identity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';
import { CamelProcessorStepsProperties } from '../../support/camel-component-types';
import { INodeMapper } from '../node-mapper';

const URI_PROCESSORS = new Set<string>(['to', 'toD', 'poll']);

export class BaseNodeMapper implements INodeMapper {
  constructor(protected readonly rootNodeMapper: INodeMapper) {}

  async getVizNodeFromProcessor(
    path: string,
    componentLookup: IVisualizationNodeIds,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    let componentName = undefined;
    let kameletName = undefined;
    if (componentLookup.primaryNodeId && URI_PROCESSORS.has(componentLookup.primaryNodeId.name)) {
      const definition = safeGetValue(entityDefinition, path);
      const uri = CamelUriHelper.getUriString(definition);
      if (uri) {
        const names = CamelUriHelper.getComponentAndKameletName(uri);
        componentName = names.componentName;
        if ('kameletName' in names) {
          kameletName = names.kameletName;
        }
      }
    }

    const { name, primaryNodeId, secondaryNodeId, tertiaryNodeId } = this.getCatalogAndNodeIds(
      componentLookup.primaryNodeId?.name,
      componentName,
      kameletName,
    );

    const data: IVisualizationNodeData = {
      name,
      path,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      processorIconTooltip: '',
      primaryNodeId,
      secondaryNodeId,
      tertiaryNodeId,
    };

    const vizNode = createVisualizationNode(path, data);

    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.primaryNodeId?.name as keyof ProcessorDefinition,
    );

    if (childrenStepsProperties.length > 0) {
      vizNode.data.isGroup = true;
    }

    for (const stepsProperty of childrenStepsProperties) {
      const childrenVizNodes = await this.getVizNodesFromChildren(path, stepsProperty, entityDefinition);

      childrenVizNodes.forEach((childVizNode) => {
        vizNode.addChild(childVizNode);
      });
    }

    return vizNode;
  }

  private getCatalogAndNodeIds(
    primaryNodeIdName: string | undefined,
    componentName?: string,
    kameletName?: string,
  ): {
    name: string;
    primaryNodeId: NodeIdentity;
    secondaryNodeId?: NodeIdentity;
    tertiaryNodeId?: NodeIdentity;
  } {
    let name: string;
    if (kameletName) {
      name = kameletName;
    } else if (componentName) {
      name = componentName;
    } else {
      name = primaryNodeIdName ?? '';
    }

    const primaryNodeId: NodeIdentity = {
      name: primaryNodeIdName ?? '',
      catalogKind: CatalogKind.Pattern,
    };

    if (
      SPECIAL_PROCESSORS_PARENTS_MAP['routeConfiguration'].includes(
        primaryNodeIdName as (typeof SPECIAL_PROCESSORS_PARENTS_MAP)['routeConfiguration'][number],
      )
    ) {
      primaryNodeId.catalogKind = CatalogKind.Entity;
    }

    let secondaryNodeId: NodeIdentity | undefined;
    let tertiaryNodeId: NodeIdentity | undefined;

    if (kameletName) {
      secondaryNodeId = { name: 'kamelet', catalogKind: CatalogKind.Component };
      tertiaryNodeId = { name: kameletName, catalogKind: CatalogKind.Kamelet };
    } else if (componentName) {
      secondaryNodeId = { name: componentName, catalogKind: CatalogKind.Component };
    }

    return { name, primaryNodeId, secondaryNodeId, tertiaryNodeId };
  }

  protected async getVizNodesFromChildren(
    path: string,
    stepsProperty: CamelProcessorStepsProperties,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode[]> {
    const subpath = `${path}.${stepsProperty.name}`;

    switch (stepsProperty.type) {
      case 'branch':
        return this.getChildrenFromBranch(subpath, entityDefinition);

      case 'single-clause':
        return this.getChildrenFromSingleClause(subpath, entityDefinition);

      case 'array-clause':
        return this.getChildrenFromArrayClause(subpath, entityDefinition);

      default:
        return [];
    }
  }

  protected async getChildrenFromBranch(path: string, entityDefinition: unknown): Promise<IVisualizationNode[]> {
    const stepsList = getValue(entityDefinition, path, []) as ProcessorDefinition[];

    const branchVizNodes: IVisualizationNode[] = [];
    for (let index = 0; index < stepsList.length; index++) {
      const step = stepsList[index];
      const singlePropertyName = Object.keys(step)[0];
      const childPath = `${path}.${index}.${singlePropertyName}`;
      const childComponentLookup = {
        primaryNodeId: { name: singlePropertyName, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
      };

      const vizNode = await this.rootNodeMapper.getVizNodeFromProcessor(
        childPath,
        childComponentLookup,
        entityDefinition,
      );

      const previousVizNode = branchVizNodes[branchVizNodes.length - 1];
      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      branchVizNodes.push(vizNode);
    }

    /** Empty steps branch placeholder */
    const placeholderPath = `${path}.${branchVizNodes.length}.placeholder`;
    const previousNode = branchVizNodes[branchVizNodes.length - 1];
    const placeholderNode = createVisualizationNode(placeholderPath, {
      name: PlaceholderType.Placeholder,
      isPlaceholder: true,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      processorIconTooltip: '',
      path: placeholderPath,
      primaryNodeId: { name: PlaceholderType.Placeholder, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
    });
    branchVizNodes.push(placeholderNode);

    if (previousNode) {
      previousNode.setNextNode(placeholderNode);
      placeholderNode.setPreviousNode(previousNode);
    }

    return branchVizNodes;
  }

  protected async getChildrenFromSingleClause(path: string, entityDefinition: unknown): Promise<IVisualizationNode[]> {
    /** If the single-clause property is not defined, return a placeholder */
    if (getValue(entityDefinition, path) === undefined) return [this.getPlaceHolderNodeForProcessor(path)];

    const processorName = path.split('.').pop() as keyof ProcessorDefinition;
    const childComponentLookup = {
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
    };

    const singleClauseVizNode = await this.rootNodeMapper.getVizNodeFromProcessor(
      path,
      childComponentLookup,
      entityDefinition,
    );

    return [singleClauseVizNode];
  }

  protected async getChildrenFromArrayClause(path: string, entityDefinition: unknown): Promise<IVisualizationNode[]> {
    const expressionList = getValue(entityDefinition, path, []) as When1[] | DoCatch[];

    const children: IVisualizationNode[] = [this.getPlaceHolderNodeForProcessor(path)];
    for (let index = 0; index < expressionList.length; index++) {
      let childPath = `${path}.${index}`;
      const processorName = path.split('.').pop() as keyof ProcessorDefinition;
      const childComponentLookup = {
        primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } satisfies NodeIdentity,
      };

      if (
        SPECIAL_PROCESSORS_PARENTS_MAP['routeConfiguration'].includes(
          processorName as (typeof SPECIAL_PROCESSORS_PARENTS_MAP)['routeConfiguration'][number],
        )
      ) {
        childPath = `${path}.${index}.${processorName}`;
      }

      const arrayClauseVizNode = await this.rootNodeMapper.getVizNodeFromProcessor(
        childPath,
        childComponentLookup,
        entityDefinition,
      );

      children.push(arrayClauseVizNode);
    }

    return children;
  }

  protected getPlaceHolderNodeForProcessor(path: string): IVisualizationNode {
    const processorName = path.split('.').pop() as keyof ProcessorDefinition;
    return createVisualizationNode(`${path}`, {
      name: processorName,
      isPlaceholder: true,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      path: `${path}`,
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Processor } satisfies NodeIdentity,
    });
  }
}
