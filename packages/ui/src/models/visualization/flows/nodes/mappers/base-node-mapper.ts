import { DoCatch, ProcessorDefinition, When1 } from '@kaoto/camel-catalog/types';
import { getValue } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { VizNodeWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';
import {
  CamelProcessorStepsProperties,
  CamelRouteVisualEntityData,
  ICamelElementLookupResult,
} from '../../support/camel-component-types';
import { INodeMapper } from '../node-mapper';
import { CanvasEdge } from '../../../../../components/Visualization/Canvas';

export class BaseNodeMapper implements INodeMapper {
  constructor(protected readonly rootNodeMapper: INodeMapper) {}

  getVizNodeFromProcessor(
    path: string,
    componentLookup: ICamelElementLookupResult,
    entityDefinition: unknown,
  ): VizNodeWithEdges {
    const nodeIconType = componentLookup.componentName ? NodeIconType.Component : NodeIconType.EIP;
    const data: CamelRouteVisualEntityData = {
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(componentLookup), nodeIconType),
      processorName: componentLookup.processorName,
      componentName: componentLookup.componentName,
    };

    const vizNode = createVisualizationNode(path, data);
    vizNode.setEndNodes([vizNode]);

    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.processorName,
    );

    if (childrenStepsProperties.length > 0) {
      vizNode.data.isGroup = true;
    }

    const edges: CanvasEdge[] = [];
    childrenStepsProperties.forEach((stepsProperty) => {
      const nodesWithEdges = this.getVizNodesFromChildren(path, stepsProperty, entityDefinition);

      nodesWithEdges.forEach((childVizNode) => {
        vizNode.addChild(childVizNode.vizNode);
        edges.push(...childVizNode.edges);
      });
    });

    return { vizNode, edges };
  }

  protected getVizNodesFromChildren(
    path: string,
    stepsProperty: CamelProcessorStepsProperties,
    entityDefinition: unknown,
  ): VizNodeWithEdges[] {
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

  protected getChildrenFromBranch(path: string, entityDefinition: unknown): VizNodeWithEdges[] {
    const stepsList = getValue(entityDefinition, path, []) as ProcessorDefinition[];
    //const canvasEdges: CanvasEdge[] = [];
    const branchVizNodesWithEdges = stepsList.reduce((accStepsNodes, step, index) => {
      const singlePropertyName = Object.keys(step)[0];
      const childPath = `${path}.${index}.${singlePropertyName}`;
      const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(
        childPath,
        getValue(step, singlePropertyName),
      );

      const { vizNode, edges } = this.rootNodeMapper.getVizNodeFromProcessor(
        childPath,
        childComponentLookup,
        entityDefinition,
      );

      const previousVizNodeWithEdges = accStepsNodes[accStepsNodes.length - 1];
      if (previousVizNodeWithEdges !== undefined) {
        const previousVizNode = previousVizNodeWithEdges.vizNode;

        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);

        /// Add edge between previous and current node
        previousVizNode.getEndNodes().forEach((endNode) => {
          edges.push(BaseNodeMapper.getEdge(endNode.id, vizNode.id));
        });
      }

      accStepsNodes.push({ vizNode, edges: edges });
      return accStepsNodes;
    }, [] as VizNodeWithEdges[]);

    /** Empty steps branch placeholder */
    if (branchVizNodesWithEdges.length === 0) {
      const placeholderPath = `${path}.${branchVizNodesWithEdges.length}.placeholder`;
      const previousNodeWithEdges = branchVizNodesWithEdges[branchVizNodesWithEdges.length - 1];
      const placeholderNode = createVisualizationNode(placeholderPath, {
        isPlaceholder: true,
        path: placeholderPath,
      });
      const placeholderNodeEdges: CanvasEdge[] = [];
      if (previousNodeWithEdges) {
        const previousNode = previousNodeWithEdges.vizNode;

        previousNode.setNextNode(placeholderNode);
        placeholderNode.setPreviousNode(previousNode);

        previousNode.getEndNodes().forEach((endNode) => {
          placeholderNodeEdges.push(BaseNodeMapper.getEdge(endNode.id, placeholderNode.id));
        });
      }
      branchVizNodesWithEdges.push({ vizNode: placeholderNode, edges: placeholderNodeEdges });
    }

    return branchVizNodesWithEdges;
  }

  protected getChildrenFromSingleClause(path: string, entityDefinition: unknown): VizNodeWithEdges[] {
    const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(path, entityDefinition);

    /** If the single-clause property is not defined, we don't create a IVisualizationNode for it */
    if (getValue(entityDefinition, path) === undefined) return [];
    return [this.rootNodeMapper.getVizNodeFromProcessor(path, childComponentLookup, entityDefinition)];
  }

  protected getChildrenFromArrayClause(path: string, entityDefinition: unknown): VizNodeWithEdges[] {
    const expressionList = getValue(entityDefinition, path, []) as When1[] | DoCatch[];

    return expressionList.map((_step, index) => {
      const childPath = `${path}.${index}`;
      const processorName = path.split('.').pop() as keyof ProcessorDefinition;
      const childComponentLookup = { processorName }; // when, doCatch

      return this.rootNodeMapper.getVizNodeFromProcessor(childPath, childComponentLookup, entityDefinition);
    });
  }

  static getEdge(source: string, target: string): CanvasEdge {
    return {
      id: `${source} >>> ${target}`,
      type: 'edge',
      source,
      target,
    };
  }
}
