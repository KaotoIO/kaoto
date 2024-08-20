import { DoCatch, ProcessorDefinition, When1 } from '@kaoto/camel-catalog/types';
import { getValue } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { IVisualizationNode } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';
import {
  CamelProcessorStepsProperties,
  CamelRouteVisualEntityData,
  ICamelElementLookupResult,
} from '../../support/camel-component-types';
import { INodeMapper } from '../node-mapper';

export class BaseNodeMapper implements INodeMapper {
  constructor(protected readonly rootNodeMapper: INodeMapper) {}

  getVizNodeFromProcessor(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const nodeIconType = componentLookup.componentName ? NodeIconType.Component : NodeIconType.EIP;
    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(componentLookup), nodeIconType),
      processorName: componentLookup.processorName,
      componentName: componentLookup.componentName,
    };

    const vizNode = createVisualizationNode(componentLookup.componentName ?? componentLookup.processorName, data);

    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.processorName,
    );

    if (childrenStepsProperties.length > 0) {
      vizNode.data.isGroup = true;
    }

    childrenStepsProperties.forEach((stepsProperty) => {
      const childrenVizNodes = this.getVizNodesFromChildren(path, stepsProperty, entityDefinition);

      childrenVizNodes.forEach((childVizNode) => {
        vizNode.addChild(childVizNode);
      });
    });

    return vizNode;
  }

  protected getVizNodesFromChildren(
    path: string,
    stepsProperty: CamelProcessorStepsProperties,
    entityDefinition: unknown,
  ): IVisualizationNode[] {
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

  protected getChildrenFromBranch(path: string, entityDefinition: unknown): IVisualizationNode[] {
    const stepsList = getValue(entityDefinition, path, []) as ProcessorDefinition[];

    return stepsList.reduce((accStepsNodes, step, index) => {
      const singlePropertyName = Object.keys(step)[0];
      const childPath = `${path}.${index}.${singlePropertyName}`;
      const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(
        childPath,
        getValue(step, singlePropertyName),
      );

      const vizNode = this.rootNodeMapper.getVizNodeFromProcessor(childPath, childComponentLookup, entityDefinition);

      const previousVizNode = accStepsNodes[accStepsNodes.length - 1];
      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      accStepsNodes.push(vizNode);
      return accStepsNodes;
    }, [] as IVisualizationNode[]);
  }

  protected getChildrenFromSingleClause(path: string, entityDefinition: unknown): IVisualizationNode[] {
    const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(path, entityDefinition);

    /** If the single-clause property is not defined, we don't create a IVisualizationNode for it */
    if (getValue(entityDefinition, path) === undefined) return [];

    return [this.rootNodeMapper.getVizNodeFromProcessor(path, childComponentLookup, entityDefinition)];
  }

  protected getChildrenFromArrayClause(path: string, entityDefinition: unknown): IVisualizationNode[] {
    const expressionList = getValue(entityDefinition, path, []) as When1[] | DoCatch[];

    return expressionList.map((_step, index) => {
      const childPath = `${path}.${index}`;
      const processorName = path.split('.').pop() as keyof ProcessorDefinition;
      const childComponentLookup = { processorName }; // when, doCatch

      return this.rootNodeMapper.getVizNodeFromProcessor(childPath, childComponentLookup, entityDefinition);
    });
  }
}
