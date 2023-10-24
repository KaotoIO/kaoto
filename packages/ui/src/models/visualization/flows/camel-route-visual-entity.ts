/* eslint-disable no-case-declarations */
import { ProcessorDefinition, RouteDefinition } from '@kaoto-next/camel-catalog/types';
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

  toVizNode(): IVisualizationNode<CamelRouteVisualEntityData> {
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

  private getVizNodeFromProcessor(
    path: string,
    componentLookup: ICamelElementLookupResult,
  ): IVisualizationNode<CamelRouteVisualEntityData> {
    const data: CamelRouteVisualEntityData = {
      label: CamelComponentSchemaService.getLabel(componentLookup, get(this.route, path)),
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(componentLookup)),
      processorName: componentLookup.processorName,
      componentName: componentLookup.componentName,
    };

    const vizNode = createVisualizationNode(data);

    const childrenVizNodes = this.getVizNodesFromSteps(path, componentLookup);
    childrenVizNodes.forEach((childVizNode) => vizNode.addChild(childVizNode));

    return vizNode;
  }

  private getVizNodesFromSteps(path: string, componentLookup: ICamelElementLookupResult): IVisualizationNode[] {
    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.processorName,
    );

    const vizNodes = childrenStepsProperties.reduce((acc, stepsProperty) => {
      if (stepsProperty.type === 'processor') {
        const childPath = `${path}.${stepsProperty.name}`;
        const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(childPath, this.route);
        const vizNode = this.getVizNodeFromProcessor(childPath, childComponentLookup);

        acc.push(vizNode);
      } else if (stepsProperty.type === 'list' || stepsProperty.type === 'expression-list') {
        const singlePath = `${path}.${stepsProperty.name}`;
        const steps = get(this.route, singlePath, []) as ProcessorDefinition[];

        const childrenVizNodes = steps.reduce((acc, step, index) => {
          let childPath: string;
          let childComponentLookup: ICamelElementLookupResult;
          if (stepsProperty.type === 'expression-list') {
            childPath = `${singlePath}.${index}`;
            childComponentLookup = { processorName: stepsProperty.name };
          } else {
            const singlePropertyName = Object.keys(step)[0];
            childPath = `${singlePath}.${index}.${singlePropertyName}`;
            childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(childPath, step);
          }

          const vizNode = this.getVizNodeFromProcessor(childPath, childComponentLookup);

          const previousVizNode = acc[acc.length - 1];
          if (previousVizNode !== undefined) {
            previousVizNode.setNextNode(vizNode);
            vizNode.setPreviousNode(previousVizNode);
          }

          acc.push(vizNode);
          return acc;
        }, [] as IVisualizationNode[]);

        acc.push(...childrenVizNodes);
      }

      return acc;
    }, [] as IVisualizationNode[]);

    return vizNodes;
  }
}
