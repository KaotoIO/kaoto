/* eslint-disable no-case-declarations */
import { Choice, To } from '@kaoto-next/camel-catalog/types';
import get from 'lodash.get';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { EntityType } from '../../camel-entities/base-entity';
import { CamelRouteStep, RouteDefinition } from '../../camel-entities/camel-overrides';
import { BaseVisualCamelEntity, VisualComponentSchema } from '../base-visual-entity';
import { VisualizationNode } from '../visualization-node';
import { CamelComponentSchemaService } from './camel-component-schema.service';

export class CamelRoute implements BaseVisualCamelEntity {
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

  getSteps(): CamelRouteStep[] {
    return this.route.from?.steps ?? [];
  }

  toVizNode(): VisualizationNode {
    const rootNode = new VisualizationNode((this.route.from?.uri as string) ?? '', this);
    rootNode.path = 'from';
    const vizNodes = this.getVizNodesFromSteps(this.getSteps(), `${rootNode.path}.steps`);

    const firstVizNode = vizNodes[0];
    if (firstVizNode !== undefined) {
      rootNode.setNextNode(firstVizNode);
      firstVizNode.setPreviousNode(rootNode);
    }

    return rootNode;
  }

  private getVizNodesFromSteps(camelRouteSteps: CamelRouteStep[] = [], path: string): VisualizationNode[] {
    return camelRouteSteps.reduce((acc, camelRouteStep, index) => {
      const previousVizNode = acc[acc.length - 1];
      const vizNode = this.getVizNodeFromStep(camelRouteStep, `${path}.${index}`);

      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      acc.push(vizNode);
      return acc;
    }, [] as VisualizationNode[]);
  }

  private getVizNodeFromStep(step: CamelRouteStep, path: string): VisualizationNode {
    const stepName = Object.keys(step)[0];
    const parentStep = new VisualizationNode(stepName);
    parentStep.path = path;

    switch (stepName) {
      case 'choice':
        /** Bring when nodes */
        (step.choice as Choice).when?.forEach((when, index) => {
          const whenNode = this.getChildren(
            'when',
            when.steps as CamelRouteStep[],
            `${path}.choice.when.${index}.steps`,
          );
          whenNode.path = `${path}.choice.when.${index}`;
          parentStep.addChild(whenNode);
        });

        /** Bring otherwise nodes */
        const otherwiseNode = this.getChildren(
          'otherwise',
          (step.choice as Choice).otherwise?.steps as CamelRouteStep[],
          `${path}.choice.otherwise.steps`,
        );
        otherwiseNode.path = `${path}.choice.otherwise`;
        parentStep.addChild(otherwiseNode);

        break;

      case 'to':
        parentStep.label = typeof step.to === 'string' ? step.to : (step.to as Exclude<To, string>).uri ?? 'To';
        break;
    }

    return parentStep;
  }

  private getChildren(label: string, steps: CamelRouteStep[], path: string): VisualizationNode {
    const node = new VisualizationNode(label);
    node.path = path;
    const children = this.getVizNodesFromSteps(steps, path);
    node.setChildren(children);
    children.forEach((child) => child.setParentNode(node));

    return node;
  }
}
