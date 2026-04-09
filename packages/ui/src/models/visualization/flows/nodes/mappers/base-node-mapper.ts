import { DoCatch, ProcessorDefinition, When1 } from '@kaoto/camel-catalog/types';

import { getValue } from '../../../../../utils';
import { CatalogKind } from '../../../../catalog-kind';
import { PlaceholderType } from '../../../../placeholder.constants';
import { SPECIAL_PROCESSORS_PARENTS_MAP } from '../../../../special-processors.constants';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';
import {
  CamelProcessorStepsProperties,
  CamelRouteVisualEntityData,
  ICamelElementLookupResult,
} from '../../support/camel-component-types';
import { NodeEnrichmentService } from '../node-enrichment.service';
import { INodeMapper } from '../node-mapper';

export class BaseNodeMapper implements INodeMapper {
  constructor(protected readonly rootNodeMapper: INodeMapper) {}

  async getVizNodeFromProcessor(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): Promise<IVisualizationNode> {
    const catalogKind = componentLookup.componentName ? CatalogKind.Component : CatalogKind.Processor;
    const data: CamelRouteVisualEntityData = {
      name: componentLookup.componentName ?? componentLookup.processorName,
      path,
      processorName: componentLookup.processorName,
      componentName: componentLookup.componentName,
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
    };

    const vizNode = createVisualizationNode(path, data);

    // Resolve catalog-derived properties
    await NodeEnrichmentService.enrichNodeFromCatalog(vizNode, catalogKind);

    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.processorName,
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
      const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(
        childPath,
        getValue(step, singlePropertyName),
      );

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
      path: placeholderPath,
    });
    branchVizNodes.push(placeholderNode);

    if (previousNode) {
      previousNode.setNextNode(placeholderNode);
      placeholderNode.setPreviousNode(previousNode);
    }

    return branchVizNodes;
  }

  protected async getChildrenFromSingleClause(path: string, entityDefinition: unknown): Promise<IVisualizationNode[]> {
    const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(path, entityDefinition);

    /** If the single-clause property is not defined, return a placeholder */
    if (getValue(entityDefinition, path) === undefined) return [this.getPlaceHolderNodeForProcessor(path)];

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
      const childComponentLookup = { processorName };

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
    return createVisualizationNode(`${path}`, {
      name: path.split('.').pop() as keyof ProcessorDefinition,
      isPlaceholder: true,
      isGroup: false,
      iconUrl: '',
      title: '',
      description: '',
      path: `${path}`,
    });
  }
}
