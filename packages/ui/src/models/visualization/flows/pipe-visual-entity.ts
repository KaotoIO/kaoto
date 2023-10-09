import get from 'lodash.get';
import set from 'lodash.set';
import { v4 as uuidv4 } from 'uuid';
import { EntityType } from '../../camel/entities';
import { PipeSink, PipeSource, PipeStep, PipeSteps } from '../../camel/entities/pipe-overrides';
import { BaseVisualCamelEntity, IVisualizationNode, VisualComponentSchema } from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { KameletSchemaService } from './kamelet-schema.service';

type PipeFlow = {
  source: PipeSource;
  steps: PipeSteps;
  sink: PipeSink;
};

export class PipeVisualEntity implements BaseVisualCamelEntity {
  readonly id = uuidv4();
  type = EntityType.Pipe;
  flow: PipeFlow;

  constructor(
    public source: PipeSource,
    public steps: PipeSteps,
    public sink: PipeSink,
  ) {
    this.flow = { source, steps, sink };
  }

  /** Internal API methods */
  getId(): string {
    return '';
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;
    const stepModel = get(this.flow, path) as PipeStep;
    return KameletSchemaService.getVisualComponentSchema(stepModel);
  }

  toJSON() {
    return this.flow;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    const stepModel = get(this.flow, path) as PipeStep;
    if (stepModel) set(stepModel, 'ref.properties', value);
  }

  getSteps() {
    const steps: PipeSteps = this.flow?.steps;
    const sink: PipeStep = this.flow?.sink;
    let allSteps: Array<PipeStep> = [];
    if (steps !== undefined) {
      allSteps = allSteps.concat(steps);
    }
    !sink || Object.keys(sink).length === 0 || allSteps.push(sink);

    return allSteps;
  }

  toVizNode(): IVisualizationNode {
    const rootNode = this.getVizNodeFromStep(this.flow?.source, 'source');
    const stepNodes = this.flow?.steps && this.getVizNodesFromSteps(this.flow?.steps);
    const sinkNode = this.getVizNodeFromStep(this.flow?.sink, 'sink');

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

  private getVizNodesFromSteps(steps: Array<PipeStep>): IVisualizationNode[] {
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

  private getVizNodeFromStep(step: PipeStep, path: string): IVisualizationNode {
    const stepName = step?.ref?.name;
    const answer = createVisualizationNode(stepName!, this);
    answer.path = path;
    const kameletDefinition = KameletSchemaService.getKameletDefinition(step);
    answer.iconData = kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'];
    return answer;
  }
}
