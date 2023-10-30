/* eslint-disable no-case-declarations */
import { DoCatch, ProcessorDefinition, RouteDefinition, When1 } from '@kaoto-next/camel-catalog/types';
import get from 'lodash.get';
import set from 'lodash.set';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { isDefined } from '../../../utils';
import { NodeIconResolver } from '../../../utils/node-icon-resolver';
import { EntityType } from '../../camel/entities';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  VisualComponentSchema,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { CamelComponentSchemaService, ICamelElementLookupResult } from './camel-component-schema.service';
import { CamelProcessorStepsProperties } from './support/camel-component-types';

type CamelRouteVisualEntityData = IVisualizationNodeData & ICamelElementLookupResult;

/** Very basic check to determine whether this object is a Camel Route */
export const isCamelRoute = (rawEntity: unknown): rawEntity is { route: RouteDefinition } => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  const objectKeys = Object.keys(rawEntity!);

  return (
    objectKeys.length === 1 &&
    'route' in rawEntity! &&
    typeof rawEntity.route === 'object' &&
    'from' in rawEntity.route!
  );
};

export class CamelRouteVisualEntity implements BaseVisualCamelEntity {
  readonly id: string;
  readonly type = EntityType.Route;

  constructor(public route: Partial<RouteDefinition> = {}) {
    this.id = route.id ?? getCamelRandomId('route');
    this.route.id = this.id;
  }

  /** Internal API methods */
  getId(): string {
    return this.id;
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;

    const componentModel = get(this.route, path);
    const visualComponentSchema = CamelComponentSchemaService.getVisualComponentSchema(path, componentModel);

    return visualComponentSchema;
  }

  toJSON() {
    return { route: this.route };
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    set(this.route, path, value);
  }

  getSteps(): ProcessorDefinition[] {
    return this.route.from?.steps ?? [];
  }

  removeStep(path?: string): void {
    if (!path) return;
    /**
     * If there's only one path segment, it means the target is the `from` property of the route
     * therefore we replace it with an empty object
     */
    if (path === 'from') {
      set(this.route, 'from.uri', '');
      return;
    }

    const pathArray = path.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    /**
     * If the last segment is a number, it means the target object is a member of an array
     * therefore we need to look for the array and remove the element at the given index
     *
     * f.i. from.steps.1.choice.when.0
     * last: 0
     */
    let array = get(this.route, pathArray.slice(0, -1), []);
    if (Number.isInteger(Number(last)) && Array.isArray(array)) {
      array.splice(Number(last), 1);

      return;
    }

    /**
     * If the last segment is a word and the penultimate is a number, it means the target is an object
     * potentially a Processor, that belongs to an array, therefore we remove it entirely
     *
     * f.i. from.steps.1.choice
     * last: choice
     * penultimate: 1
     */
    array = get(this.route, pathArray.slice(0, -2), []);
    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate)) && Array.isArray(array)) {
      array.splice(Number(penultimate), 1);

      return;
    }

    /**
     * If both the last and penultimate segment are words, it means the target is a property of an object
     * therefore we delete it
     *
     * f.i. from.steps.1.choice.otherwise
     * last: otherwise
     * penultimate: choice
     */
    const object = get(this.route, pathArray.slice(0, -1), {});
    if (!Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate)) && typeof object === 'object') {
      delete object[last];
    }
  }

  toVizNode(): IVisualizationNode {
    const rootNode = this.getVizNodeFromProcessor('from', { processorName: 'from' });
    rootNode.data.entity = this;

    rootNode.getChildren()?.forEach((child, index) => {
      if (index === 0) {
        rootNode.setNextNode(child);
        child.setPreviousNode(rootNode);
      }

      child.setParentNode();
      rootNode.setChildren();
    });

    return rootNode;
  }

  private getVizNodeFromProcessor(path: string, componentLookup: ICamelElementLookupResult): IVisualizationNode {
    const data: CamelRouteVisualEntityData = {
      label: CamelComponentSchemaService.getLabel(componentLookup, get(this.route, path)),
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(componentLookup)),
      processorName: componentLookup.processorName,
      componentName: componentLookup.componentName,
    };

    const vizNode = createVisualizationNode(data);

    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.processorName as keyof ProcessorDefinition,
    );

    childrenStepsProperties.forEach((stepsProperty) => {
      const childrenVizNodes = this.getVizNodesFromChildren(path, stepsProperty);
      childrenVizNodes.forEach((childVizNode) => vizNode.addChild(childVizNode));
    });

    return vizNode;
  }

  private getVizNodesFromChildren(path: string, stepsProperty: CamelProcessorStepsProperties): IVisualizationNode[] {
    let singlePath: string;

    switch (stepsProperty.type) {
      case 'steps-list':
        singlePath = `${path}.${stepsProperty.name}`;
        const stepsList = get(this.route, singlePath, []) as ProcessorDefinition[];

        return stepsList.reduce((accStepsNodes, step, index) => {
          const singlePropertyName = Object.keys(step)[0];
          const childPath = `${singlePath}.${index}.${singlePropertyName}`;
          const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(childPath, step);

          const vizNode = this.getVizNodeFromProcessor(childPath, childComponentLookup);

          const previousVizNode = accStepsNodes[accStepsNodes.length - 1];
          if (previousVizNode !== undefined) {
            previousVizNode.setNextNode(vizNode);
            vizNode.setPreviousNode(previousVizNode);
          }

          accStepsNodes.push(vizNode);
          return accStepsNodes;
        }, [] as IVisualizationNode[]);

      case 'single-processor':
        const childPath = `${path}.${stepsProperty.name}`;
        const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(childPath, this.route);
        return [this.getVizNodeFromProcessor(childPath, childComponentLookup)];

      case 'expression-list':
        singlePath = `${path}.${stepsProperty.name}`;
        const expressionList = get(this.route, singlePath, []) as When1[] | DoCatch[];

        return expressionList.map((_step, index) => {
          const childPath = `${singlePath}.${index}`;
          const childComponentLookup = { processorName: stepsProperty.name as keyof ProcessorDefinition }; // when, doCatch

          return this.getVizNodeFromProcessor(childPath, childComponentLookup);
        });

      default:
        return [];
    }
  }
}
