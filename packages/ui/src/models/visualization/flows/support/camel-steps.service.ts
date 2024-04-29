/* eslint-disable no-case-declarations */
import { DoCatch, ProcessorDefinition, When1 } from '@kaoto/camel-catalog/types';
import { getValue } from '../../../../utils';
import { NodeIconResolver } from '../../../../utils/node-icon-resolver';
import { IVisualizationNode } from '../../base-visual-entity';
import { createVisualizationNode } from '../../visualization-node';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import {
  CamelProcessorStepsProperties,
  CamelRouteVisualEntityData,
  ICamelElementLookupResult,
} from './camel-component-types';

export class CamelStepsService {
  static getVizNodeFromProcessor(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): IVisualizationNode {
    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(componentLookup)),
      processorName: componentLookup.processorName,
      componentName: componentLookup.componentName,
    };

    const vizNode = createVisualizationNode(componentLookup.componentName ?? componentLookup.processorName, data);

    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.processorName as keyof ProcessorDefinition,
    );

    childrenStepsProperties.forEach((stepsProperty) => {
      const childrenVizNodes = this.getVizNodesFromChildren(path, stepsProperty, entityDefinition);
      childrenVizNodes.forEach((childVizNode) => vizNode.addChild(childVizNode));
    });

    return vizNode;
  }

  private static getVizNodesFromChildren(
    path: string,
    stepsProperty: CamelProcessorStepsProperties,
    entityDefinition: unknown,
  ): IVisualizationNode[] {
    let singlePath: string;

    switch (stepsProperty.type) {
      case 'branch':
        singlePath = `${path}.${stepsProperty.name}`;
        const stepsList = getValue(entityDefinition, singlePath, []) as ProcessorDefinition[];

        return stepsList.reduce((accStepsNodes, step, index) => {
          const singlePropertyName = Object.keys(step)[0];
          const childPath = `${singlePath}.${index}.${singlePropertyName}`;
          const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(
            childPath,
            getValue(step, singlePropertyName),
          );

          const vizNode = this.getVizNodeFromProcessor(childPath, childComponentLookup, entityDefinition);

          const previousVizNode = accStepsNodes[accStepsNodes.length - 1];
          if (previousVizNode !== undefined) {
            previousVizNode.setNextNode(vizNode);
            vizNode.setPreviousNode(previousVizNode);
          }

          accStepsNodes.push(vizNode);
          return accStepsNodes;
        }, [] as IVisualizationNode[]);

      case 'single-clause':
        const childPath = `${path}.${stepsProperty.name}`;
        const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(childPath, entityDefinition);

        /** If the single-clause property is not defined, we don't create a IVisualizationNode for it */
        if (getValue(entityDefinition, childPath) === undefined) return [];

        return [this.getVizNodeFromProcessor(childPath, childComponentLookup, entityDefinition)];

      case 'clause-list':
        singlePath = `${path}.${stepsProperty.name}`;
        const expressionList = getValue(entityDefinition, singlePath, []) as When1[] | DoCatch[];

        return expressionList.map((_step, index) => {
          const childPath = `${singlePath}.${index}`;
          const childComponentLookup = { processorName: stepsProperty.name as keyof ProcessorDefinition }; // when, doCatch

          return this.getVizNodeFromProcessor(childPath, childComponentLookup, entityDefinition);
        });

      default:
        return [];
    }
  }
}
