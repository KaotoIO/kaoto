import { Pipe } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import {
  getArrayProperty,
  getCustomSchemaFromPipe,
  getValue,
  setValue,
  updatePipeFromCustomSchema,
} from '../../../utils';
import { EntityType } from '../../camel/entities';
import { PipeStep } from '../../camel/entities/pipe-overrides';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { DefinedComponent } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
} from '../base-visual-entity';
import { IClipboardCopyObject } from '../clipboard';
import { createVisualizationNode } from '../visualization-node';
import { CamelCatalogService } from './camel-catalog.service';
import { KameletSchemaService } from './support/kamelet-schema.service';
import { ModelValidationService } from './support/validators/model-validation.service';

export class PipeVisualEntity implements BaseVisualCamelEntity {
  id: string;
  readonly type: EntityType = EntityType.Pipe;
  static readonly ROOT_PATH = 'pipe';

  constructor(public pipe: Pipe) {
    this.id = (pipe.metadata?.name as string) ?? getCamelRandomId('pipe');

    this.pipe.metadata = pipe.metadata ?? {};
    this.pipe.metadata.name = this.id;
    this.pipe.spec = pipe.spec ?? {
      source: {},
      steps: [],
      sink: {},
    };
  }

  getRootPath(): string {
    return PipeVisualEntity.ROOT_PATH;
  }

  /** Internal API methods */
  getId(): string {
    return this.id;
  }

  setId(routeId: string): void {
    this.id = routeId;
    this.pipe.metadata!.name = this.id;
  }

  getNodeLabel(path?: string): string {
    if (!path) return '';

    if (path === this.getRootPath()) {
      return this.id;
    }

    const stepModel: PipeStep = getValue(this.pipe.spec, path);
    return KameletSchemaService.getNodeLabel(stepModel, path);
  }

  getNodeTitle(path?: string): string {
    if (!path) return '';

    if (path === this.getRootPath()) {
      return 'Pipe';
    }

    const stepModel: PipeStep = getValue(this.pipe.spec, path);
    return KameletSchemaService.getNodeTitle(stepModel);
  }

  getTooltipContent(path?: string): string {
    if (!path) return '';

    const stepModel: PipeStep = getValue(this.pipe.spec, path);
    return KameletSchemaService.getTooltipContent(stepModel, path);
  }

  getNodeSchema(path?: string): KaotoSchemaDefinition['schema'] | undefined {
    if (!path) return undefined;
    if (path === this.getRootPath()) {
      return this.getRootPipeSchema();
    }

    const stepModel: PipeStep = getValue(this.pipe.spec, path);
    return (
      KameletSchemaService.getKameletCatalogEntry(stepModel)?.propertiesSchema ??
      ({} as KaotoSchemaDefinition['schema'])
    );
  }

  getNodeDefinition(path?: string): unknown {
    if (!path) return undefined;
    if (path === this.getRootPath()) {
      return getCustomSchemaFromPipe(this.pipe);
    }

    const stepModel: PipeStep = getValue(this.pipe.spec, path);
    return stepModel?.properties ?? {};
  }

  getOmitFormFields(): string[] {
    return [];
  }

  toJSON() {
    return this.pipe.spec;
  }

  updateModel(path: string | undefined, value: Record<string, unknown>): void {
    if (!path) return;

    if (path === this.getRootPath()) {
      updatePipeFromCustomSchema(this.pipe, value);
      this.id = this.pipe.metadata!.name as string;
      return;
    }

    const stepModel = getValue(this.pipe.spec, path) as PipeStep;
    if (stepModel) setValue(stepModel, 'properties', value);
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
    if (!newKamelet) return;

    const step: PipeStep = {
      ref: {
        kind: newKamelet.kind,
        apiVersion: newKamelet.apiVersion,
        name: options.definedComponent.name,
      },
    };

    this.addNewStep(step, options.mode, options.data);
  }

  getCopiedContent(path?: string) {
    if (!path) return;

    const stepModel: PipeStep = getValue(this.pipe.spec, path);
    return { type: SourceSchemaType.Pipe, name: stepModel?.ref?.name ?? '', definition: stepModel as object };
  }

  pasteStep(options: { clipboardContent: IClipboardCopyObject; mode: AddStepMode; data: IVisualizationNodeData }) {
    const step = options.clipboardContent.definition as PipeStep;
    this.addNewStep(step, options.mode, options.data);
  }

  canDragNode(path?: string) {
    if (!isDefined(path)) return false;

    return path !== 'source' && path !== 'sink';
  }

  canDropOnNode(path?: string) {
    return this.canDragNode(path);
  }

  removeStep(path?: string): void {
    /** This method needs to be enabled after passing the entire parent to this class*/
    if (!path) return;
    /**
     * If the path is `source` or `sink`, we can remove it directly
     */
    if (path === 'source' || path === 'sink') {
      setValue(this.pipe.spec, path, {});
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
    const array = getArrayProperty(this.pipe.spec!, pathArray.slice(0, -1).join('.'));
    if (Number.isInteger(Number(last)) && Array.isArray(array)) {
      array.splice(Number(last), 1);
    }
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    return {
      /** Pipe cannot have a Kamelet before the source property */
      canHavePreviousStep: data.path !== this.getRootPath() && data.path !== 'source',
      /** Pipe cannot have a Kamelet after the sink property */
      canHaveNextStep: data.path !== this.getRootPath() && data.path !== 'sink',
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canReplaceStep: data.path !== this.getRootPath(),
      canRemoveStep: data.path !== this.getRootPath(),
      canRemoveFlow: data.path === this.getRootPath(),
      canBeDisabled: false,
    };
  }

  getNodeValidationText(path?: string | undefined): string | undefined {
    const schema = this.getNodeSchema(path);
    const definition = this.getNodeDefinition(path);
    if (!schema || !definition) return undefined;

    return ModelValidationService.validateNodeStatus(schema, definition);
  }

  isVerified(_path?: string): boolean | undefined {
    return undefined;
  }

  hasMessage(_path?: string): boolean | undefined {
    return undefined;
  }

  getMessage(_path?: string): Record<string, unknown> | undefined {
    return undefined;
  }

  toVizNode(): IVisualizationNode {
    const pipeGroupNode = createVisualizationNode(this.id, {
      catalogKind: CatalogKind.Entity,
      name: this.type,
      path: this.getRootPath(),
      entity: this,
      isGroup: true,
    });

    const sourceNode = this.getVizNodeFromStep(this.pipe.spec!.source, 'source', true);
    const stepNodes = this.getVizNodesFromSteps(this.pipe.spec!.steps);
    const sinkNode = this.getVizNodeFromStep(this.pipe.spec!.sink, 'sink');

    pipeGroupNode.addChild(sourceNode);
    stepNodes.forEach((stepNode) => pipeGroupNode.addChild(stepNode));
    pipeGroupNode.addChild(sinkNode);

    /** If there are no steps, we link the `source` and the `sink` together */
    if (stepNodes.length === 0) {
      sourceNode.setNextNode(sinkNode);
      sinkNode.setPreviousNode(sourceNode);
      return pipeGroupNode;
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

    return pipeGroupNode;
  }

  private addNewStep(step: PipeStep, mode: AddStepMode, data: IVisualizationNodeData) {
    const path = data.path;
    if (!path) return;

    /** Replace an existing Kamelet */
    if (mode === AddStepMode.ReplaceStep) {
      setValue(this.pipe.spec, path, step);
      return;
    }

    /** Add a new Kamelet to the Kamelets array */
    const kameletArray: PipeStep[] = getArrayProperty(this.pipe.spec!, 'steps');
    const index = Number(path.split('.').pop());
    if (mode === AddStepMode.AppendStep) {
      kameletArray.splice(index + 1, 0, step);
    } else if (mode === AddStepMode.PrependStep && data.path === 'sink') {
      kameletArray.push(step);
    } else if (mode === AddStepMode.PrependStep) {
      kameletArray.splice(index, 0, step);
    }
  }

  private getVizNodeFromStep(step: PipeStep, path: string, isRoot = false): IVisualizationNode {
    const isPlaceholder = step?.ref?.name === undefined;

    const data: IVisualizationNodeData = {
      catalogKind: CatalogKind.Kamelet,
      name: step?.ref?.name ?? 'placeholder',
      path,
      entity: isRoot ? this : undefined,
      isPlaceholder,
    };

    return createVisualizationNode(path, data);
  }

  private getVizNodesFromSteps(steps: PipeStep[] = []): IVisualizationNode[] {
    return steps.reduce((acc, kamelet, index) => {
      const vizNode = this.getVizNodeFromStep(kamelet, `steps.${index}`);

      const previousVizNode = acc[acc.length - 1];
      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      acc.push(vizNode);
      return acc;
    }, [] as IVisualizationNode[]);
  }

  private getRootPipeSchema(): KaotoSchemaDefinition['schema'] {
    const rootPipeDefinition = CamelCatalogService.getComponent(CatalogKind.Entity, 'PipeConfiguration');

    if (rootPipeDefinition === undefined) return {} as unknown as KaotoSchemaDefinition['schema'];

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (rootPipeDefinition.propertiesSchema !== undefined) {
      schema = rootPipeDefinition.propertiesSchema;
    }

    return schema;
  }

  getGroupIcons(): { icon: string; title: string }[] {
    return [];
  }
}
