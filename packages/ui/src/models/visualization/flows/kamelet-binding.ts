import { KameletBinding as KameletBindingModel } from '@kaoto-next/camel-catalog/types';
import get from 'lodash.get';
import set from 'lodash.set';
import { v4 as uuidv4 } from 'uuid';
import { EntityType } from '../../camel-entities';
import { KameletBindingStep, KameletBindingSteps } from '../../camel-entities/kamelet-binding-overrides';
import { BaseVisualCamelEntity, IVisualizationNode, VisualComponentSchema } from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { KameletSchemaService } from './kamelet-schema.service';

export class KameletBinding implements BaseVisualCamelEntity {
  readonly id = uuidv4();
  type = EntityType.KameletBinding;

  constructor(public route: Partial<KameletBindingModel> = {}) {}

  /** Internal API methods */
  getId(): string {
    return '';
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;
    const stepModel = get(this.route.spec, path) as KameletBindingStep;
    return KameletSchemaService.getVisualComponentSchema(stepModel);
  }

  toJSON() {
    return this.route;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    const stepModel = get(this.route.spec, path) as KameletBindingStep;
    if (stepModel) set(stepModel, 'ref.properties', value);
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

  toVizNode(): IVisualizationNode {
    const rootNode = this.getVizNodeFromStep(this.route.spec?.source, 'source');
    const stepNodes = this.route.spec?.steps && this.getVizNodesFromSteps(this.route.spec?.steps);
    const sinkNode = this.getVizNodeFromStep(this.route.spec?.sink, 'sink');

    if (stepNodes !== undefined) {
      const firstStepNode = stepNodes[0];
      if (firstStepNode !== undefined) {
        rootNode.setNextNode(firstStepNode);
        firstStepNode.setPreviousNode(rootNode);
      }
    }
    if (sinkNode !== undefined) {
      if (stepNodes !== undefined) {
        const lastStepNode = stepNodes[stepNodes.length - 1];
        if (lastStepNode !== undefined) {
          lastStepNode.setNextNode(sinkNode);
          sinkNode.setPreviousNode(lastStepNode);
        }
      } else {
        rootNode.setNextNode(sinkNode);
        sinkNode.setPreviousNode(rootNode);
      }
    }
    return rootNode;
  }

  private getVizNodesFromSteps(steps: Array<KameletBindingStep>): IVisualizationNode[] {
    if (!Array.isArray(steps)) {
      return [] as IVisualizationNode[];
    }
    return steps?.reduce((acc, camelRouteStep) => {
      const previousVizNode = acc[acc.length - 1];
      const vizNode = this.getVizNodeFromStep(camelRouteStep, 'steps.' + acc.length);

      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }
      acc.push(vizNode);
      return acc;
    }, [] as IVisualizationNode[]);
  }

  private getVizNodeFromStep(step: KameletBindingStep, path: string): IVisualizationNode {
    const stepName = step?.ref?.name;
    const answer = createVisualizationNode(stepName!, this);
    answer.path = path;
    const kameletDefinition = KameletSchemaService.getKameletDefinition(step);
    answer.iconData = kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'];
    return answer;
  }
}
