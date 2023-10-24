import get from 'lodash.get';
import set from 'lodash.set';
import { v4 as uuidv4 } from 'uuid';
import { NodeIconResolver } from '../../../utils/node-icon-resolver';
import { EntityType } from '../../camel/entities';
import { PipeSpec, PipeStep, PipeSteps } from '../../camel/entities/pipe-overrides';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  VisualComponentSchema,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { KameletSchemaService } from './kamelet-schema.service';

export class PipeVisualEntity implements BaseVisualCamelEntity {
  readonly id = uuidv4();
  type = EntityType.Pipe;

  constructor(public spec?: PipeSpec) {}

  /** Internal API methods */
  getId(): string {
    return this.id;
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;
    const stepModel = get(this.spec, path) as PipeStep;
    return KameletSchemaService.getVisualComponentSchema(stepModel);
  }

  toJSON() {
    return this.spec;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    const stepModel = get(this.spec, path) as PipeStep;
    if (stepModel) set(stepModel, 'ref.properties', value);
  }

  getSteps() {
    const steps: PipeSteps = this.spec?.steps;
    const sink: PipeStep = this.spec?.sink;
    let allSteps: Array<PipeStep> = [];
    if (steps !== undefined) {
      allSteps = allSteps.concat(steps);
    }
    !sink || Object.keys(sink).length === 0 || allSteps.push(sink);

    return allSteps;
  }

  removeStep(): void {
    /** This method needs to be enabled after passing the entire parent to this class*/
    // if (!path) return;
    // /**
    //  * If the path is `source` or `sink`, we can remove it directly
    //  */
    // if (path === 'source' || path === 'sink') {
    //   set(this.parent, path, {});
    //   return;
    // }
    // const pathArray = path.split('.');
    // const last = pathArray[pathArray.length - 1];
    // /**
    //  * If the last segment is a number, it means the target object is a member of an array
    //  * therefore we need to look for the array and remove the element at the given index
    //  *
    //  * f.i. from.steps.1.choice.when.0
    //  * last: 0
    //  */
    // const array = get(this.parent, pathArray.slice(0, -1), []);
    // if (Number.isInteger(Number(last)) && Array.isArray(array)) {
    //   array.splice(Number(last), 1);
    // }
  }

  toVizNode(): IVisualizationNode {
    const rootNode = this.getVizNodeFromStep(this.spec?.source, 'source');
    const stepNodes = this.spec?.steps && this.getVizNodesFromSteps(this.spec?.steps);
    const sinkNode = this.getVizNodeFromStep(this.spec?.sink, 'sink');

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
    const kameletDefinition = KameletSchemaService.getKameletDefinition(step);
    const data: IVisualizationNodeData = {
      label: step?.ref?.name ?? 'Unknown',
      path,
      entity: this,
      icon:
        kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'] ?? NodeIconResolver.getUnknownIcon(),
    };
    const answer = createVisualizationNode(data);

    answer.setIconData(
      kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'] ?? NodeIconResolver.getUnknownIcon(),
    );
    return answer;
  }
}
