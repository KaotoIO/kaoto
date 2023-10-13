/* eslint-disable no-case-declarations */
import { Choice, ProcessorDefinition, RouteDefinition, To } from '@kaoto-next/camel-catalog/types';
import get from 'lodash.get';
import set from 'lodash.set';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { EntityType } from '../../camel/entities';
import { BaseVisualCamelEntity, IVisualizationNode, VisualComponentSchema } from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import { isDefined } from '../../../utils';

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
    const rootNode = createVisualizationNode((this.route.from?.uri as string) ?? '', this);
    rootNode.path = 'from';
    const vizNodes = this.getVizNodesFromSteps(this.getSteps(), `${rootNode.path}.steps`);

    const firstVizNode = vizNodes[0];
    if (firstVizNode !== undefined) {
      rootNode.setNextNode(firstVizNode);
      firstVizNode.setPreviousNode(rootNode);
    }

    return rootNode;
  }

  private getVizNodesFromSteps(camelRouteSteps: ProcessorDefinition[] = [], path: string): IVisualizationNode[] {
    return camelRouteSteps.reduce((acc, camelRouteStep, index) => {
      const previousVizNode = acc[acc.length - 1];
      const vizNode = this.getVizNodeFromStep(camelRouteStep, `${path}.${index}`);

      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      acc.push(vizNode);
      return acc;
    }, [] as IVisualizationNode[]);
  }

  private getVizNodeFromStep(processor: ProcessorDefinition, path: string): IVisualizationNode {
    const processorName = Object.keys(processor)[0];
    const parentStep = createVisualizationNode(processorName);
    parentStep.path = `${path}.${processorName}`;

    switch (processorName) {
      case 'choice':
        /** Bring when nodes */
        processor.choice?.when?.forEach((when, index) => {
          const whenNode = this.getChildren(
            'when',
            when.steps as ProcessorDefinition[],
            `${path}.choice.when.${index}.steps`,
          );
          whenNode.path = `${path}.choice.when.${index}`;
          parentStep.addChild(whenNode);
        });

        /** Bring otherwise nodes */
        const otherwiseNode = this.getChildren(
          'otherwise',
          (processor.choice as Choice).otherwise?.steps as ProcessorDefinition[],
          `${path}.choice.otherwise.steps`,
        );
        otherwiseNode.path = `${path}.choice.otherwise`;
        parentStep.addChild(otherwiseNode);

        break;

      case 'to':
        parentStep.label =
          typeof processor.to === 'string' ? processor.to : (processor.to as Exclude<To, string>).uri ?? 'To';
        break;
    }

    return parentStep;
  }

  private getChildren(label: string, steps: ProcessorDefinition[], path: string): IVisualizationNode {
    const node = createVisualizationNode(label);
    node.path = path;
    const children = this.getVizNodesFromSteps(steps, path);
    node.setChildren(children);
    children.forEach((child) => child.setParentNode(node));

    return node;
  }
}
