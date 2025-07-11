import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { camelCaseToSpaces } from '@kaoto/forms';
import { getArrayProperty, getValue, isDefined, setValue } from '../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../utils/node-icon-resolver';
import { DefinedComponent } from '../../camel-catalog-index';
import { EntityType } from '../../camel/entities';
import { NodeLabelType } from '../../settings/settings.model';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
  VizNodesWithEdges,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentDefaultService } from './support/camel-component-default.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { CamelProcessorStepsProperties, CamelRouteVisualEntityData } from './support/camel-component-types';
import { ModelValidationService } from './support/validators/model-validation.service';
import { IClipboardCopyObject } from '../../../components/Visualization/Custom/hooks/copy-step.hook';
import { SourceSchemaType } from '../../camel/source-schema-type';

export abstract class AbstractCamelVisualEntity<T extends object> implements BaseVisualCamelEntity {
  constructor(public entityDef: T) {}

  abstract id: string;
  abstract type: EntityType;
  abstract getRootPath(): string;
  abstract setId(id: string): void;
  abstract toJSON(): unknown;
  protected abstract getRootUri(): string | undefined;

  getId(): string {
    return this.id;
  }

  getNodeLabel(path?: string, labelType?: NodeLabelType): string {
    if (!path) return '';
    if (path === this.getRootPath()) {
      const description: string | undefined = getValue(this.entityDef, `${this.getRootPath()}.description`);
      if (labelType === NodeLabelType.Description && description) {
        return description;
      }

      return this.id;
    }

    const componentModel = getValue(this.entityDef, path);

    const label = CamelComponentSchemaService.getNodeLabel(
      CamelComponentSchemaService.getCamelComponentLookup(path, componentModel),
      componentModel,
      labelType,
    );

    return label;
  }

  getNodeTitle(path?: string): string {
    if (!path) return '';
    if (path === this.getRootPath()) {
      return camelCaseToSpaces(this.getRootPath(), { capitalize: true });
    }

    const componentModel = getValue(this.entityDef, path);

    const title = CamelComponentSchemaService.getNodeTitle(
      CamelComponentSchemaService.getCamelComponentLookup(path, componentModel),
    );

    return title;
  }

  getTooltipContent(path?: string): string {
    if (!path) return '';
    const componentModel = getValue(this.entityDef, path);

    const content = CamelComponentSchemaService.getTooltipContent(
      CamelComponentSchemaService.getCamelComponentLookup(path, componentModel),
    );

    return content;
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;

    const componentModel = getValue(this.entityDef, path);
    const visualComponentSchema = CamelComponentSchemaService.getVisualComponentSchema(path, componentModel);

    /** Overriding parameters with an empty object When the parameters property is mistakenly set to null */
    if (visualComponentSchema?.definition?.parameters === null) {
      visualComponentSchema.definition.parameters = {};
    }

    return visualComponentSchema;
  }

  getOmitFormFields(): string[] {
    return ['from', 'outputs', 'steps', 'when', 'otherwise', 'doCatch', 'doFinally', 'uri'];
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;
    const updatedValue = CamelComponentSchemaService.getMultiValueSerializedDefinition(path, value);

    setValue(this.entityDef, path, updatedValue);
  }

  /**
   * Add a step to the route
   *
   * path examples:
   *      route.from
   *      route.from.steps.0.setHeader
   *      route.from.steps.1.choice.when.0
   *      route.from.steps.1.choice.when.0.steps.0.setHeader
   *      route.from.steps.1.choice.otherwise
   *      route.from.steps.1.choice.otherwise.steps.0.setHeader
   *      route.from.steps.2.doTry.doCatch.0
   *      route.from.steps.2.doTry.doCatch.0.steps.0.setHeader
   */
  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
  }) {
    const defaultValue = CamelComponentDefaultService.getDefaultNodeDefinitionValue(options.definedComponent);
    this.addNewStep(defaultValue, options.mode, options.data, options.definedComponent.name);
  }

  getCopiedContent(path?: string): IClipboardCopyObject | undefined {
    if (!path) return;

    const componentModel = getValue(this.entityDef, path);
    const componentLookup = CamelComponentSchemaService.getCamelComponentLookup(path, componentModel);

    return {
      type: SourceSchemaType.Route,
      name: componentLookup.processorName as string,
      definition: componentModel,
    };
  }

  pasteStep(options: { clipboardContent: IClipboardCopyObject; mode: AddStepMode; data: IVisualizationNodeData }) {
    const defaultValue = CamelComponentSchemaService.getNodeDefinitionValue(options.clipboardContent);
    this.addNewStep(defaultValue, options.mode, options.data, options.clipboardContent.name);
  }

  canDragNode(path?: string) {
    if (!isDefined(path)) return false;

    return path !== 'route.from' && path !== 'template.from';
  }

  canDropOnNode(path?: string) {
    return this.canDragNode(path);
  }

  /** To Do: combine with addstep()
   *  Try to re-use insertChildStep()
   */
  moveNodeTo(options: { draggedNodePath: string; droppedNodePath?: string }) {
    if (options.droppedNodePath === undefined) return;

    const pathArray = options.droppedNodePath.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    const componentPath = options.draggedNodePath.split('.');
    let stepsArray: ProcessorDefinition[];

    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate))) {
      const componentModel = getValue(this.entityDef, componentPath?.slice(0, -1));
      stepsArray = getArrayProperty(this.entityDef, pathArray.slice(0, -2).join('.'));

      /** Remove the dragged node */
      this.removeStep(options.draggedNodePath);

      /** Add the dragged node before the drop target */
      const desiredStartIndex = last === 'placeholder' ? 0 : Number(penultimate);
      stepsArray.splice(desiredStartIndex, 0, componentModel);
    }

    if (Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate))) {
      const componentModel = getValue(this.entityDef, componentPath);
      stepsArray = getArrayProperty(this.entityDef, pathArray.slice(0, -1).join('.'));

      /** Remove the dragged node */
      this.removeStep(options.draggedNodePath);

      /** Add the dragged node before the drop target */
      stepsArray.splice(Number(last), 0, componentModel);
    }
  }

  removeStep(path?: string): void {
    if (!path) return;
    const pathArray = path.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    /**
     * If the last segment is a number, it means the target object is a member of an array
     * therefore we need to look for the array and remove the element at the given index
     *
     * f.i. route.from.steps.1.choice.when.0
     * last: 0
     */
    let array = getValue(this.entityDef, pathArray.slice(0, -1), []);
    if (Number.isInteger(Number(last)) && Array.isArray(array)) {
      array.splice(Number(last), 1);

      return;
    }

    /**
     * If the last segment is a word and the penultimate is a number, it means the target is an object
     * potentially a Processor, that belongs to an array, therefore we remove it entirely
     *
     * f.i. route.from.steps.1.choice
     * last: choice
     * penultimate: 1`
     */
    array = getValue(this.entityDef, pathArray.slice(0, -2), []);
    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate)) && Array.isArray(array)) {
      array.splice(Number(penultimate), 1);

      return;
    }

    /**
     * If both the last and penultimate segment are words, it means the target is a property of an object
     * therefore we delete it
     *
     * f.i. route.from.steps.1.choice.otherwise
     * last: otherwise
     * penultimate: choice
     */
    const object = getValue(this.entityDef, pathArray.slice(0, -1), {});
    if (!Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate)) && typeof object === 'object') {
      delete object[last];
    }
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    const processorName = (data as CamelRouteVisualEntityData).processorName;
    const canHavePreviousStep = CamelComponentSchemaService.canHavePreviousStep(processorName);
    const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(processorName);
    const canHaveChildren = stepsProperties.find((property) => property.type === 'branch') !== undefined;
    const canHaveSpecialChildren = Object.keys(stepsProperties).length > 1;
    const canReplaceStep = CamelComponentSchemaService.canReplaceStep(processorName);
    const canRemoveStep = !CamelComponentSchemaService.DISABLED_REMOVE_STEPS.includes(processorName);
    const canRemoveFlow = data.path === this.getRootPath();
    const canBeDisabled = CamelComponentSchemaService.canBeDisabled(processorName);

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canRemoveFlow,
      canBeDisabled,
    };
  }

  getNodeValidationText(path?: string | undefined): string | undefined {
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): VizNodesWithEdges {
    const routeGroupNode = createVisualizationNode(this.getRootPath(), {
      path: this.getRootPath(),
      entity: this,
      isGroup: true,
      icon: NodeIconResolver.getIcon(this.type, NodeIconType.Entity),
      processorName: 'route',
    });

    const { nodes: fromNodes, edges: fromEdges } = NodeMapperService.getVizNode(
      `${this.getRootPath()}.from`,
      {
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: CamelComponentSchemaService.getComponentNameFromUri(this.getRootUri()!),
      },
      this.entityDef,
    );

    fromNodes.forEach((node) => {
      routeGroupNode.addChild(node);
    });

    return { nodes: [routeGroupNode], edges: fromEdges };
  }

  private addNewStep(
    defaultValue: ProcessorDefinition,
    mode: AddStepMode,
    data: IVisualizationNodeData,
    childName: string,
  ) {
    if (data.path === undefined) return;
    const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      (data as CamelRouteVisualEntityData).processorName,
    );

    if (mode === AddStepMode.InsertChildStep || mode === AddStepMode.InsertSpecialChildStep) {
      this.insertChildStep(mode, data, childName, stepsProperties, defaultValue);
      return;
    }

    const pathArray = data.path.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    /**
     * If the last segment is a string and the penultimate is a number, it means the target is member of an array
     * therefore we need to look for the array and insert the element at the given index + 1
     *
     * f.i. route.from.steps.0.setHeader
     * penultimate: 0
     * last: setHeader
     */
    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate))) {
      /** If we're in Append mode, we need to insert the step after the selected index hence `Number(penultimate) + 1` */
      const desiredStartIndex = mode === AddStepMode.AppendStep ? Number(penultimate) + 1 : Number(penultimate);

      /** If we're in Replace mode, we need to delete the existing step */
      const deleteCount = mode === AddStepMode.ReplaceStep ? 1 : 0;

      const stepsArray: ProcessorDefinition[] = getArrayProperty(this.entityDef, pathArray.slice(0, -2).join('.'));
      stepsArray.splice(desiredStartIndex, deleteCount, defaultValue);

      return;
    }
  }

  private insertChildStep(
    mode: AddStepMode,
    data: IVisualizationNodeData,
    childName: string,
    stepsProperties: CamelProcessorStepsProperties[],
    defaultValue: ProcessorDefinition = {},
  ) {
    const property = stepsProperties.find((property) =>
      mode === AddStepMode.InsertChildStep ? 'steps' : childName === property.name,
    );
    if (property === undefined) return;

    if (property.type === 'single-clause') {
      setValue(this.entityDef, `${data.path}.${property.name}`, defaultValue);
    } else {
      const arrayPath: ProcessorDefinition[] = getArrayProperty(this.entityDef, `${data.path}.${property.name}`);
      arrayPath.unshift(defaultValue);
    }
  }
}
