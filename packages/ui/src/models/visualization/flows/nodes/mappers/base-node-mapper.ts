import { DoCatch, ProcessorDefinition, When1 } from '@kaoto/camel-catalog/types';
import { getValue } from '../../../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../../../utils/node-icon-resolver';
import { IVisualizationNode, VizNodesWithEdges, VizNodeWithEdges } from '../../../base-visual-entity';
import { createVisualizationNode } from '../../../visualization-node';
import { CamelComponentSchemaService } from '../../support/camel-component-schema.service';
import {
  CamelProcessorStepsProperties,
  CamelRouteVisualEntityData,
  ICamelElementLookupResult,
} from '../../support/camel-component-types';
import { INodeMapper } from '../node-mapper';
import { EdgeStyle } from '@patternfly/react-topology';
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

    const canvasEdges: CanvasEdge[] = [];
    childrenStepsProperties.forEach((stepsProperty) => {
      const { nodes, edges } = this.getVizNodesFromChildren(path, stepsProperty, entityDefinition);
      canvasEdges.push(...edges);

      nodes.forEach((childVizNode) => {
        vizNode.addChild(childVizNode as unknown as IVisualizationNode);
      });
    });

    // consider add end nodes to the vizNode
    return { vizNode, edges: canvasEdges };
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
    const canvasEdges: CanvasEdge[] = [];
    const branchVizNodes = stepsList.reduce((accStepsNodes, step, index) => {
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

      const previousVizNode = accStepsNodes[accStepsNodes.length - 1];
      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);

        /// Add edge between previous and current node
        previousVizNode.getEndNodes().forEach((endNode) => {
          edges.push(BaseNodeMapper.getEdge(endNode.id, vizNode.id));
        });
      }

      accStepsNodes.push(vizNode);
      canvasEdges.push(...edges);
      return accStepsNodes;
    }, [] as IVisualizationNode[]);

    /** Empty steps branch placeholder */
    if (branchVizNodes.length === 0) {
      const placeholderPath = `${path}.${branchVizNodes.length}.placeholder`;
      const previousNode = branchVizNodes[branchVizNodes.length - 1];
      const placeholderNode = createVisualizationNode(placeholderPath, {
        isPlaceholder: true,
        path: placeholderPath,
      });
      branchVizNodes.push(placeholderNode);

      if (previousNode) {
        previousNode.setNextNode(placeholderNode);
        placeholderNode.setPreviousNode(previousNode);
        previousNode.getEndNodes().forEach((endNode) => {
          canvasEdges.push(BaseNodeMapper.getEdge(endNode.id, placeholderNode.id));
        });
      }
    }

    return { nodes: branchVizNodes, edges: canvasEdges };
  }

  protected getChildrenFromSingleClause(path: string, entityDefinition: unknown): VizNodesWithEdges {
    const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(path, entityDefinition);

    /** If the single-clause property is not defined, we don't create a IVisualizationNode for it */
    if (getValue(entityDefinition, path) === undefined) return { nodes: [], edges: [] };
    const { vizNode, edges } = this.rootNodeMapper.getVizNodeFromProcessor(
      path,
      childComponentLookup,
      entityDefinition,
    );

    return { nodes: [vizNode], edges };
  }

  protected getChildrenFromArrayClause(path: string, entityDefinition: unknown): VizNodesWithEdges {
    const expressionList = getValue(entityDefinition, path, []) as When1[] | DoCatch[];
    const nodes: IVisualizationNode[] = [];
    const edges: CanvasEdge[] = [];

    expressionList.forEach((_step, index) => {
      const childPath = `${path}.${index}`;
      const processorName = path.split('.').pop() as keyof ProcessorDefinition;
      const childComponentLookup = { processorName }; // when, doCatch

      const vizNodeWithEdges = this.rootNodeMapper.getVizNodeFromProcessor(
        childPath,
        childComponentLookup,
        entityDefinition,
      );
      nodes.push(vizNodeWithEdges.vizNode);
      edges.push(...vizNodeWithEdges.edges);
    });

    return { nodes, edges };
  }

  static getEdge(source: string, target: string, edgeStyle = EdgeStyle.solid): CanvasEdge {
    return {
      id: `${source} >>> ${target}`,
      type: 'edge',
      source,
      target,
      edgeStyle: edgeStyle,
    };
  }
}
