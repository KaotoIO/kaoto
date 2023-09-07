/* eslint-disable no-case-declarations */
import {
  FromDefinition as CamelFromDefinition,
  RouteDefinition as CamelRouteDefinition,
  Choice,
  To,
} from '@kaoto-next/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';
import { VisualizationNode } from '../../visualization';
import { BaseCamelEntity, EntityType } from '../base-entity';
import { CamelRouteStep } from './step';

interface FromDefinition extends Omit<CamelFromDefinition, 'steps'> {
  steps: CamelRouteStep[];
}

interface RouteDefinition extends Omit<CamelRouteDefinition, 'from'> {
  from: FromDefinition;
}

export class CamelRoute implements BaseCamelEntity {
  readonly id = uuidv4();
  readonly type = EntityType.Route;

  constructor(public route: Partial<RouteDefinition> = {}) {}

  /** Internal API methods */
  getId(): string {
    return this.route.id ?? '';
  }

  getSteps(): CamelRouteStep[] {
    return this.route.from?.steps ?? [];
  }

  toVizNode(): VisualizationNode {
    const rootNode = new VisualizationNode(this.route.from?.uri ?? '');
    const vizNodes = this.getVizNodesFromSteps(this.getSteps());

    const firstVizNode = vizNodes[0];
    if (firstVizNode !== undefined) {
      rootNode.setNextNode(firstVizNode);
      firstVizNode.setPreviousNode(rootNode);
    }

    return rootNode;
  }

  private getVizNodesFromSteps(camelRouteSteps: CamelRouteStep[] = []): VisualizationNode[] {
    return camelRouteSteps.reduce((acc, camelRouteStep) => {
      const previousVizNode = acc[acc.length - 1];
      const vizNode = this.getVizNodeFromStep(camelRouteStep);

      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      acc.push(vizNode);
      return acc;
    }, [] as VisualizationNode[]);
  }

  private getVizNodeFromStep(step: CamelRouteStep): VisualizationNode {
    const stepName = Object.keys(step)[0];
    const parentStep = new VisualizationNode(stepName);

    switch (stepName) {
      case 'choice':
        /** Bring when nodes */
        (step.choice as Choice).when?.forEach((when) => {
          const whenNode = this.getChildren('when', when.steps as CamelRouteStep[]);
          parentStep.addChild(whenNode);
        });

        /** Bring otherwise nodes */
        const otherwiseNode = this.getChildren(
          'otherwise',
          (step.choice as Choice).otherwise?.steps as CamelRouteStep[],
        );
        parentStep.addChild(otherwiseNode);

        break;

      case 'to':
        parentStep.label = typeof step.to === 'string' ? step.to : (step.to as Exclude<To, string>).uri ?? 'To';
        break;
    }

    return parentStep;
  }

  private getChildren(label: string, steps: CamelRouteStep[]): VisualizationNode {
    const node = new VisualizationNode(label);
    const children = this.getVizNodesFromSteps(steps);
    node.setChildren(children);
    children.forEach((child) => child.setParentNode(node));

    return node;
  }
}
