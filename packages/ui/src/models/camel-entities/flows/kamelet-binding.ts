import { KameletBinding as KameletBindingModel } from '@kaoto-next/camel-catalog/types';
import { v4 as uuidv4 } from 'uuid';
import { VisualizationNode } from '../../visualization';
import { BaseVisualCamelEntity, EntityType } from '../base-entity';
import { KameletBindingSink, KameletBindingSource, KameletBindingStep, KameletBindingSteps } from '../kamelet-binding';

export class KameletBinding implements BaseVisualCamelEntity {
  readonly id = uuidv4();
  readonly type = EntityType.KameletBinding;

  constructor(public route: Partial<KameletBindingModel> = {}) {}

  /** Internal API methods */
  getId(): string {
    return '';
  }

  getSteps() {
    const steps: KameletBindingSteps = this.route.spec?.steps;
    const sink: KameletBindingStep = this.route.spec?.sink;
    let allSteps: Array<KameletBindingStep> = [];
    if (steps !== undefined) {
      allSteps = allSteps.concat(steps);
    }
    !sink || allSteps.push(sink);

    return allSteps;
  }

  toVizNode(): VisualizationNode {
    const source: KameletBindingSource = this.route.spec?.source;
    const rootNode = new VisualizationNode(source?.ref?.name ?? '');
    const vizNodes = this.getVizNodesFromSteps(this.getSteps());

    if (vizNodes !== undefined) {
      const firstVizNode = vizNodes[0];
      if (firstVizNode !== undefined) {
        rootNode.setNextNode(firstVizNode);
        firstVizNode.setPreviousNode(rootNode);
      }
    }
    return rootNode;
  }

  private getVizNodesFromSteps(steps: Array<KameletBindingStep>): VisualizationNode[] {
    return steps?.reduce((acc, camelRouteStep) => {
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

  private getVizNodeFromStep(step: KameletBindingSink): VisualizationNode {
    const stepName = step?.ref?.name;
    const parentStep = new VisualizationNode(stepName!);
    return parentStep;
  }
}
