import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { camelCaseToSpaces, isDefined } from '@kaoto/forms';

import { getArrayProperty, getValue, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { DefinedComponent } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { NodeLabelType } from '../../settings/settings.model';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
} from '../base-visual-entity';
import { IClipboardCopyObject } from '../clipboard';
import { createVisualizationNode } from '../visualization-node';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentDefaultService } from './support/camel-component-default.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { CamelProcessorStepsProperties, CamelRouteVisualEntityData } from './support/camel-component-types';
import { ModelValidationService } from './support/validators/model-validation.service';

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

  getNodeSchema(path?: string): KaotoSchemaDefinition['schema'] | undefined {
    if (!path) return undefined;

    const definition = getValue(this.entityDef, path);
    const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);
    return CamelComponentSchemaService.getSchema(camelElementLookup);
  }

  getNodeDefinition(path?: string): unknown {
    if (!path) return undefined;

    const definition = getValue(this.entityDef, path);
    const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup(path, definition);
    const updatedDefinition = CamelComponentSchemaService.getUpdatedDefinition(camelElementLookup, definition);

    /** Overriding parameters with an empty object When the parameters property is mistakenly set to null */
    if (updatedDefinition?.parameters === null) {
      updatedDefinition.parameters = {};
    }

    return updatedDefinition;
  }

  getOmitFormFields(): string[] {
    return ['from', 'outputs', 'steps', 'when', 'otherwise', 'doCatch', 'doFinally'];
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
    const canHaveChildren = stepsProperties.some((property) => property.type === 'branch');
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
    const schema = this.getNodeSchema(path);
    const definition = this.getNodeDefinition(path);
    if (!schema || !definition) return undefined;

    return ModelValidationService.validateNodeStatus(schema, definition);
  }

  getGroupIcons(): { icon: string; title: string }[] {
    return [];
  }

  toVizNode(): IVisualizationNode {
    const routeGroupNode = createVisualizationNode(this.getRootPath(), {
      catalogKind: CatalogKind.Entity,
      name: this.type,
      path: this.getRootPath(),
      entity: this,
      isGroup: true,
      processorName: 'route',
    });

    const fromNode = NodeMapperService.getVizNode(
      `${this.getRootPath()}.from`,
      {
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: CamelComponentSchemaService.getComponentNameFromUri(this.getRootUri()!),
      },
      this.entityDef,
    );

    if (!this.getRootUri()) {
      fromNode.data.catalogKind = CatalogKind.Entity;
      fromNode.data.name = 'placeholder';
    }
    routeGroupNode.addChild(fromNode);

    fromNode.getChildren()?.forEach((child, index) => {
      routeGroupNode.addChild(child);
      if (index === 0) {
        fromNode.setNextNode(child);
        child.setPreviousNode(fromNode);
      }

      const previousChild = fromNode.getChildren()?.[index - 1];
      if (previousChild) {
        previousChild.setNextNode(child);
        child.setPreviousNode(previousChild);
      }
    });
    fromNode.getChildren()?.splice(0);
    fromNode.data.isGroup = false;

    const normalizeGroups = (node: IVisualizationNode) => {
      const children = node.getChildren() ?? [];

      if (node.data.isGroup && children.length === 0) {
        node.data.isGroup = false;
      }

      children.forEach((child) => normalizeGroups(child));
    };

    normalizeGroups(routeGroupNode);

    return routeGroupNode;
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
    const last = pathArray.at(-1);
    const penultimate = pathArray.at(-2);

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

    /**
     * If the last segment is a number and the penultimate is a string, it also means the target is member of an array
     *
     * f.i. route.from.steps.0.choice.when.0
     * penultimate: when
     * last: 0
     */
    if (Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate))) {
      /** If we're in Append mode, we need to insert the step after the selected index hence `Number(last) + 1` */
      const desiredStartIndex = mode === AddStepMode.AppendStep ? Number(last) + 1 : Number(last);

      /** If we're in Replace mode, we need to delete the existing step */
      const deleteCount = mode === AddStepMode.ReplaceStep ? 1 : 0;

      const stepsArray = getArrayProperty(this.entityDef, pathArray.slice(0, -1).join('.'));
      stepsArray.splice(desiredStartIndex, deleteCount, defaultValue);
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
      mode === AddStepMode.InsertChildStep ? arrayPath.unshift(defaultValue) : arrayPath.push(defaultValue);
    }
  }
}
