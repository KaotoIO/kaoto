import { Pipe } from '@kaoto-next/camel-catalog/types';
import get from 'lodash.get';
import set from 'lodash.set';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getArrayProperty } from '../../../utils';
import { NodeIconResolver } from '../../../utils/node-icon-resolver';
import { DefinedComponent } from '../../camel-catalog-index';
import { EntityType } from '../../camel/entities';
import { PipeMetadata, PipeSpec, PipeStep, PipeSteps } from '../../camel/entities/pipe-overrides';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { KameletSchemaService } from './support/kamelet-schema.service';

export class PipeVisualEntity implements BaseVisualCamelEntity {
  id: string;
  type = EntityType.Pipe;
  spec: PipeSpec;
  metadata: PipeMetadata;

  constructor(spec?: PipeSpec, metadata?: PipeMetadata) {
    this.id = (metadata?.name as string) ?? getCamelRandomId('pipe');
    this.metadata = metadata ?? { name: this.id };
    this.spec = spec ?? {
      source: {},
      steps: [],
      sink: {},
    };
  }

  /** Internal API methods */
  getId(): string {
    return this.id;
  }

  setId(routeId: string): void {
    this.id = routeId;
    this.metadata.name = this.id;
  }

  getNodeLabel(path?: string): string {
    if (!path) return '';

    const stepModel = get(this.spec, path) as PipeStep;
    return KameletSchemaService.getNodeLabel(stepModel, path);
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
    if (stepModel) set(stepModel, 'properties', value);
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

  /**
   * Add a step to the Pipe
   *
   * path examples:
   *      source
   *      sink
   *      steps.0
   *      steps.1
   */
  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
  }) {
    const newKamelet = options.definedComponent.definition as unknown as Pipe;
    const path = options.data.path;
    if (!newKamelet || !path) return;

    const step: PipeStep = {
      ref: {
        kind: newKamelet.kind,
        apiVersion: newKamelet.apiVersion,
        name: options.definedComponent.name,
      },
    };

    /** Replace an existing Kamelet */
    if (options.mode === AddStepMode.ReplaceStep) {
      if (path === 'source' || path === 'sink') {
        set(this.spec, path, step);
      } else {
        set(this.spec, path, step);
      }

      return;
    }

    /** Add a new Kamelet to the Kamelets array */
    const kameletArray = getArrayProperty(this.spec, 'steps') as PipeStep[];
    const index = Number(path.split('.').pop());
    if (options.mode === AddStepMode.AppendStep) {
      kameletArray.splice(index + 1, 0, step);
    } else if (options.mode === AddStepMode.PrependStep && options.data.path === 'sink') {
      kameletArray.push(step);
    } else if (options.mode === AddStepMode.PrependStep) {
      kameletArray.splice(index, 0, step);
    }
  }

  removeStep(path?: string): void {
    /** This method needs to be enabled after passing the entire parent to this class*/
    if (!path) return;
    /**
     * If the path is `source` or `sink`, we can remove it directly
     */
    if (path === 'source' || path === 'sink') {
      set(this.spec, path, {});
      return;
    }
    const pathArray = path.split('.');
    const last = pathArray[pathArray.length - 1];
    /**
     * If the last segment is a number, it means the target object is a member of an array
     * therefore we need to look for the array and remove the element at the given index
     *
     * f.i. from.steps.1.choice.when.0
     * last: 0
     */
    const array = get(this.spec, pathArray.slice(0, -1), []);
    if (Number.isInteger(Number(last)) && Array.isArray(array)) {
      array.splice(Number(last), 1);
    }
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    return {
      /** Pipe cannot have a Kamelet before the source property */
      canHavePreviousStep: data.path !== 'source',
      /** Pipe cannot have a Kamelet after the sink property */
      canHaveNextStep: data.path !== 'sink',
      canHaveChildren: false,
      canHaveSpecialChildren: false,
    };
  }

  getNodeValidationText(_path?: string | undefined): string | undefined {
    return undefined;
  }

  toVizNode(): IVisualizationNode {
    const sourceNode = this.getVizNodeFromStep(this.spec.source, 'source', true);
    const stepNodes = this.getVizNodesFromSteps(this.spec.steps);
    const sinkNode = this.getVizNodeFromStep(this.spec.sink, 'sink');
    /** If there are no steps, we link the `source` and the `sink` together */

    if (stepNodes.length === 0) {
      sourceNode.setNextNode(sinkNode);
      sinkNode.setPreviousNode(sourceNode);
      return sourceNode;
    }

    /** Connect the `source` with the first step */
    const firstStepNode = stepNodes[0];
    if (firstStepNode !== undefined) {
      sourceNode.setNextNode(firstStepNode);
      firstStepNode.setPreviousNode(sourceNode);
    }

    /** Connect the last step with the `sink` */
    const lastStepNode = stepNodes[stepNodes.length - 1];
    if (lastStepNode !== undefined) {
      lastStepNode.setNextNode(sinkNode);
      sinkNode.setPreviousNode(lastStepNode);
    }

    return sourceNode;
  }

  private getVizNodeFromStep(step: PipeStep, path: string, isRoot = false): IVisualizationNode {
    const kameletDefinition = KameletSchemaService.getKameletDefinition(step);
    const isPlaceholder = step?.ref?.name === undefined;
    const icon = isPlaceholder
      ? NodeIconResolver.getPlaceholderIcon()
      : kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'] ?? NodeIconResolver.getUnknownIcon();

    const data: IVisualizationNodeData = {
      path,
      entity: isRoot ? this : undefined,
      isPlaceholder,
      icon,
    };

    return createVisualizationNode(step?.ref?.name ?? path, data);
  }

  private getVizNodesFromSteps(steps?: PipeStep[]): IVisualizationNode[] {
    if (!Array.isArray(steps)) {
      return [] as IVisualizationNode[];
    }

    return steps?.reduce((acc, kamelet) => {
      const vizNode = this.getVizNodeFromStep(kamelet, 'steps.' + acc.length);

      const previousVizNode = acc[acc.length - 1];
      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      acc.push(vizNode);
      return acc;
    }, [] as IVisualizationNode[]);
  }
}
