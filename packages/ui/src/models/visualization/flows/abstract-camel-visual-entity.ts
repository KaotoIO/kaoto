/* eslint-disable no-case-declarations */
import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { SchemaService } from '../../../components/Form/schema.service';
import { ROOT_PATH, getArrayProperty, getValue, setValue } from '../../../utils';
import { NodeIconResolver, NodeIconType } from '../../../utils/node-icon-resolver';
import { DefinedComponent } from '../../camel-catalog-index';
import { EntityType } from '../../camel/entities';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { CamelComponentDefaultService } from './support/camel-component-default.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { CamelProcessorStepsProperties, CamelRouteVisualEntityData } from './support/camel-component-types';
import { CamelStepsService } from './support/camel-steps.service';
import { ModelValidationService } from './support/validators/model-validation.service';

export abstract class AbstractCamelVisualEntity<T extends object> implements BaseVisualCamelEntity {
  constructor(public route: T) {}

  abstract id: string;
  abstract type: EntityType;
  abstract setId(id: string): void;
  abstract toJSON(): unknown;
  protected abstract getRootUri(): string | undefined;

  getId(): string {
    return this.id;
  }

  getNodeLabel(path?: string, labelType?: string): string {
    if (!path) return '';

    const componentModel = getValue(this.route, path);
    const label = CamelComponentSchemaService.getNodeLabel(
      CamelComponentSchemaService.getCamelComponentLookup(path, componentModel),
      componentModel,
      labelType,
    );

    return label;
  }

  getTooltipContent(path?: string): string {
    if (!path) return '';
    const componentModel = getValue(this.route, path);

    const content = CamelComponentSchemaService.getTooltipContent(
      CamelComponentSchemaService.getCamelComponentLookup(path, componentModel),
    );

    return content;
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;

    const componentModel = getValue(this.route, path);
    const visualComponentSchema = CamelComponentSchemaService.getVisualComponentSchema(path, componentModel);

    return visualComponentSchema;
  }

  getOmitFormFields(): string[] {
    return SchemaService.OMIT_FORM_FIELDS;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;
    const updatedValue = CamelComponentSchemaService.getUriSerializedDefinition(path, value);

    setValue(this.route, path, updatedValue);
  }

  /**
   * Add a step to the route
   *
   * path examples:
   *      from
   *      from.steps.0.setHeader
   *      from.steps.1.choice.when.0
   *      from.steps.1.choice.when.0.steps.0.setHeader
   *      from.steps.1.choice.otherwise
   *      from.steps.1.choice.otherwise.steps.0.setHeader
   *      from.steps.2.doTry.doCatch.0
   *      from.steps.2.doTry.doCatch.0.steps.0.setHeader
   */
  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
  }) {
    if (options.data.path === undefined) return;
    const defaultValue = CamelComponentDefaultService.getDefaultNodeDefinitionValue(options.definedComponent);
    const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      (options.data as CamelRouteVisualEntityData).processorName as keyof ProcessorDefinition,
    );

    if (options.mode === AddStepMode.InsertChildStep || options.mode === AddStepMode.InsertSpecialChildStep) {
      this.insertChildStep(options, stepsProperties, defaultValue);
      return;
    }

    const pathArray = options.data.path.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    /**
     * If the last segment is a string and the penultimate is a number, it means the target is member of an array
     * therefore we need to look for the array and insert the element at the given index + 1
     *
     * f.i. from.steps.0.setHeader
     * penultimate: 0
     * last: setHeader
     */
    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate))) {
      /** If we're in Append mode, we need to insert the step after the selected index hence `Number(penultimate) + 1` */
      const desiredStartIndex = options.mode === AddStepMode.AppendStep ? Number(penultimate) + 1 : Number(penultimate);

      /** If we're in Replace mode, we need to delete the existing step */
      const deleteCount = options.mode === AddStepMode.ReplaceStep ? 1 : 0;

      const stepsArray: ProcessorDefinition[] = getValue(this.route, pathArray.slice(0, -2), []);
      stepsArray.splice(desiredStartIndex, deleteCount, defaultValue);

      return;
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
     * f.i. from.steps.1.choice.when.0
     * last: 0
     */
    let array = getValue(this.route, pathArray.slice(0, -1), []);
    if (Number.isInteger(Number(last)) && Array.isArray(array)) {
      array.splice(Number(last), 1);

      return;
    }

    /**
     * If the last segment is a word and the penultimate is a number, it means the target is an object
     * potentially a Processor, that belongs to an array, therefore we remove it entirely
     *
     * f.i. from.steps.1.choice
     * last: choice
     * penultimate: 1
     */
    array = getValue(this.route, pathArray.slice(0, -2), []);
    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate)) && Array.isArray(array)) {
      array.splice(Number(penultimate), 1);

      return;
    }

    /**
     * If both the last and penultimate segment are words, it means the target is a property of an object
     * therefore we delete it
     *
     * f.i. from.steps.1.choice.otherwise
     * last: otherwise
     * penultimate: choice
     */
    const object = getValue(this.route, pathArray.slice(0, -1), {});
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
    const canRemoveStep = processorName !== ('from' as keyof ProcessorDefinition);
    const canRemoveFlow = data.path === ROOT_PATH;
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

  toVizNode(): IVisualizationNode {
    const routeGroupNode = createVisualizationNode(this.id, {
      path: ROOT_PATH,
      entity: this,
      isGroup: true,
      icon: NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity),
    });

    const fromNode = CamelStepsService.getVizNodeFromProcessor(
      'from',
      {
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: CamelComponentSchemaService.getComponentNameFromUri(this.getRootUri()!),
      },
      this.route,
    );

    if (!this.getRootUri()) {
      fromNode.data.icon = NodeIconResolver.getPlaceholderIcon();
    }
    routeGroupNode.addChild(fromNode);

    return routeGroupNode;
  }

  private insertChildStep(
    options: Parameters<AbstractCamelVisualEntity<object>['addStep']>[0],
    stepsProperties: CamelProcessorStepsProperties[],
    defaultValue: ProcessorDefinition = {},
  ) {
    const property = stepsProperties.find((property) =>
      options.mode === AddStepMode.InsertChildStep ? 'steps' : options.definedComponent.name === property.name,
    );
    if (property === undefined) return;

    if (property.type === 'single-clause') {
      setValue(this.route, `${options.data.path}.${property.name}`, defaultValue);
    } else {
      const arrayPath = getArrayProperty(this.route, `${options.data.path}.${property.name}`);
      arrayPath.unshift(defaultValue);
    }
  }
}
