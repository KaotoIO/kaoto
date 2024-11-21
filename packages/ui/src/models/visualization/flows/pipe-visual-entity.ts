import { Pipe } from '@kaoto/camel-catalog/types';
import { get } from 'lodash';
import { set } from 'lodash';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { SchemaService } from '../../../components/Form/schema.service';
import {
  getArrayProperty,
  NodeIconResolver,
  NodeIconType,
  ROOT_PATH,
  getCustomSchemaFromPipe,
  updatePipeFromCustomSchema,
  setValue,
  getValue,
} from '../../../utils';
import { DefinedComponent } from '../../camel-catalog-index';
import { EntityType } from '../../camel/entities';
import { PipeStep } from '../../camel/entities/pipe-overrides';
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
import { ModelValidationService } from './support/validators/model-validation.service';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { CamelCatalogService } from './camel-catalog.service';
import { CatalogKind } from '../../catalog-kind';

export class PipeVisualEntity implements BaseVisualCamelEntity {
  id: string;
  readonly type: EntityType = EntityType.Pipe;

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
    return ROOT_PATH;
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

    const stepModel = get(this.pipe.spec, path) as PipeStep;
    return KameletSchemaService.getNodeLabel(stepModel, path);
  }

  getTooltipContent(path?: string): string {
    if (!path) return '';

    const stepModel = get(this.pipe.spec, path) as PipeStep;
    return KameletSchemaService.getTooltipContent(stepModel, path);
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;
    if (path === this.getRootPath()) {
      return {
        schema: this.getRootPipeSchema(),
        definition: getCustomSchemaFromPipe(this.pipe),
      };
    }

    const stepModel = get(this.pipe.spec, path) as PipeStep;
    return KameletSchemaService.getVisualComponentSchema(stepModel);
  }

  getOmitFormFields(): string[] {
    return SchemaService.OMIT_FORM_FIELDS;
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
        set(this.pipe.spec!, path, step);
      } else {
        set(this.pipe.spec!, path, step);
      }

      return;
    }

    /** Add a new Kamelet to the Kamelets array */
    const kameletArray = getArrayProperty(this.pipe.spec!, 'steps') as PipeStep[];
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
      set(this.pipe.spec!, path, {});
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
    const array = get(this.pipe.spec, pathArray.slice(0, -1), []);
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
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): IVisualizationNode {
    const pipeGroupNode = createVisualizationNode(this.id, {
      path: this.getRootPath(),
      entity: this,
      isGroup: true,
      icon: NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity),
    });

    const sourceNode = this.getVizNodeFromStep(this.pipe.spec!.source, 'source', true);
    const stepNodes = this.getVizNodesFromSteps(this.pipe.spec!.steps);
    const sinkNode = this.getVizNodeFromStep(this.pipe.spec!.sink, 'sink');
    /** If there are no steps, we link the `source` and the `sink` together */

    pipeGroupNode.setTitle('Pipe');
    pipeGroupNode.addChild(sourceNode);
    stepNodes.forEach((stepNode) => pipeGroupNode.addChild(stepNode));
    pipeGroupNode.addChild(sinkNode);

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

  private getVizNodeFromStep(step: PipeStep, path: string, isRoot = false): IVisualizationNode {
    const kameletDefinition = KameletSchemaService.getKameletDefinition(step);
    const isPlaceholder = step?.ref?.name === undefined;
    const icon = isPlaceholder
      ? NodeIconResolver.getPlaceholderIcon()
      : (kameletDefinition?.metadata.annotations['camel.apache.org/kamelet.icon'] ?? NodeIconResolver.getUnknownIcon());

    const data: IVisualizationNodeData = {
      path,
      entity: isRoot ? this : undefined,
      isPlaceholder,
      icon,
    };

    const vizNode = createVisualizationNode(step?.ref?.name ?? path, data);
    vizNode.setTitle(kameletDefinition?.metadata.name ?? '');

    return vizNode;
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

  private getRootPipeSchema(): KaotoSchemaDefinition['schema'] {
    const rootPipeDefinition = CamelCatalogService.getComponent(CatalogKind.Entity, 'PipeConfiguration');

    if (rootPipeDefinition === undefined) return {} as unknown as KaotoSchemaDefinition['schema'];

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (rootPipeDefinition.propertiesSchema !== undefined) {
      schema = rootPipeDefinition.propertiesSchema;
    }

    return schema;
  }
}
