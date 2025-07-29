import { DoCatch, ProcessorDefinition, When1 } from '@kaoto/camel-catalog/types';
import { getValue } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { IVisualizationNode, VizNodesWithEdges } from '../../../base-visual-entity';
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
  ): VizNodesWithEdges {
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

      nodesWithEdges.nodes.forEach((childVizNode) => {
        vizNode.addChild(childVizNode);
      });
      edges.push(...nodesWithEdges.edges);
    });

    return { nodes: [vizNode], edges };
  }

  protected getVizNodesFromChildren(
    path: string,
    stepsProperty: CamelProcessorStepsProperties,
    entityDefinition: unknown,
  ): VizNodesWithEdges {
    const subpath = `${path}.${stepsProperty.name}`;

    switch (stepsProperty.type) {
      case 'branch':
        return this.getChildrenFromBranch(subpath, entityDefinition);

      case 'single-clause':
        return this.getChildrenFromSingleClause(subpath, entityDefinition);

      case 'array-clause':
        return this.getChildrenFromArrayClause(subpath, entityDefinition);

      default:
        return { nodes: [], edges: [] };
    }
  }

  protected getChildrenFromBranch(path: string, entityDefinition: unknown): VizNodesWithEdges {
    const stepsList = getValue(entityDefinition, path, []) as ProcessorDefinition[];
    //const canvasEdges: CanvasEdge[] = [];

    const { nodes: branchNodes, edges: branchEdges } = stepsList.reduce(
      (accStepsNodes, step, index) => {
        const { nodes: accNodes, edges: accEdges } = accStepsNodes;
        const singlePropertyName = Object.keys(step)[0];
        const childPath = `${path}.${index}.${singlePropertyName}`;
        const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(
          childPath,
          getValue(step, singlePropertyName),
        );

        const { nodes, edges } = this.rootNodeMapper.getVizNodeFromProcessor(
          childPath,
          childComponentLookup,
          entityDefinition,
        );
        const vizNode = nodes[0];
        const previousVizNode = accNodes[accNodes.length - 1];

        if (previousVizNode !== undefined) {
          previousVizNode.setNextNode(vizNode);
          vizNode.setPreviousNode(previousVizNode);

          /// Add edge between previous and current node
          previousVizNode.getEndNodes().forEach((endNode) => {
            edges.push(BaseNodeMapper.getEdge(endNode.id, vizNode.id));
          });
        }

        accNodes.push(...nodes);
        accEdges.push(...edges);
        return { nodes: accNodes, edges: accEdges };
      },
      { nodes: [], edges: [] } as VizNodesWithEdges,
    );

    /** Empty steps branch placeholder */
    if (branchNodes.length === 0) {
      const placeholderPath = `${path}.${branchNodes.length}.placeholder`;
      const previousNode = branchNodes[branchNodes.length - 1];
      const placeholderNode = createVisualizationNode(placeholderPath, {
        isPlaceholder: true,
        path: placeholderPath,
      });

      if (previousNode) {
        previousNode.setNextNode(placeholderNode);
        placeholderNode.setPreviousNode(previousNode);

        previousNode.getEndNodes().forEach((endNode) => {
          branchEdges.push(BaseNodeMapper.getEdge(endNode.id, placeholderNode.id));
        });
      }
      branchNodes.push(placeholderNode);
    }

    return { nodes: branchNodes, edges: branchEdges };
  }

  protected getChildrenFromSingleClause(path: string, entityDefinition: unknown): VizNodesWithEdges {
    const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(path, entityDefinition);

    /** If the single-clause property is not defined, we don't create a IVisualizationNode for it */
    if (getValue(entityDefinition, path) === undefined) return { nodes: [], edges: [] };

    return this.rootNodeMapper.getVizNodeFromProcessor(path, childComponentLookup, entityDefinition);
  }

  protected getChildrenFromArrayClause(path: string, entityDefinition: unknown): VizNodesWithEdges {
    const expressionList = getValue(entityDefinition, path, []) as When1[] | DoCatch[];
    const vizNodes: IVisualizationNode[] = [];
    const edges: CanvasEdge[] = [];

    expressionList.forEach((_step, index) => {
      const childPath = `${path}.${index}`;
      const processorName = path.split('.').pop() as keyof ProcessorDefinition;
      const childComponentLookup = { processorName }; // when, doCatch

      const { nodes, edges } = this.rootNodeMapper.getVizNodeFromProcessor(
        childPath,
        childComponentLookup,
        entityDefinition,
      );
      vizNodes.push(...nodes);
      edges.push(...edges);
    });

    return { nodes: vizNodes, edges: edges };
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
