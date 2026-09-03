import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { cloneDeep } from 'lodash';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { getArrayProperty, getValue, setValue } from '../../../utils';
import { DefinedComponent } from '../../camel/camel-catalog-index';
import { uriDefinitionParser } from '../../camel/parsers/uri-definition.parser';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { PlaceholderType } from '../../placeholder.constants';
import { NodeLabelType } from '../../settings/settings.model';
import { SPECIAL_CHILD_PROCESSORS } from '../../special-processors.constants';
import {
  AddStepMode,
  BaseVisualEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  IVisualizationNodeIds,
  NodeInteraction,
} from '../base-visual-entity';
import { IClipboardContent } from '../clipboard';
import { NodeIdentity } from '../node-identity';
import { createVisualizationNode } from '../visualization-node';
import { NodeEnrichmentService } from './nodes/node-enrichment.service';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentDefaultService } from './support/camel-component-default.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { CamelProcessorStepsProperties } from './support/camel-component-types';
import { ProcessorStepsService } from './support/processor-steps.service';
import { ModelValidationService } from './support/validators/model-validation.service';

export abstract class AbstractCamelVisualEntity<T extends object> implements BaseVisualEntity {
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

  getNodeLabel(path?: string, labelType?: NodeLabelType, ids?: IVisualizationNodeIds): string {
    if (!path) return '';
    if (path === this.getRootPath()) {
      const description: string | undefined = getValue(this.entityDef, `${this.getRootPath()}.description`);
      if (labelType === NodeLabelType.Description && description) {
        return description;
      }

      return this.id;
    }

    const definition = getValue(this.entityDef, path);
    return this.getNodeLabelFromIds(ids, definition, labelType);
  }

  async fetchNodeSchema(ids?: IVisualizationNodeIds): Promise<KaotoSchemaDefinition['schema'] | undefined> {
    if (!ids?.primaryNodeId) {
      return;
    }

    /* This could be an Entity or Pattern (EIP) */
    const primaryCatalogEntry = await DynamicCatalogRegistry.get().getEntity(
      ids.primaryNodeId.catalogKind,
      ids.primaryNodeId.name,
    );

    if (!primaryCatalogEntry?.propertiesSchema) {
      return;
    }

    const schema: KaotoSchemaDefinition['schema'] = cloneDeep(primaryCatalogEntry?.propertiesSchema);

    /* This would be a Component, in case it's not, we can return the schema so far */
    if (ids.secondaryNodeId?.catalogKind !== CatalogKind.Component) {
      return schema;
    }

    const camelComponentDefinition = await DynamicCatalogRegistry.get().getEntity(
      ids.secondaryNodeId.catalogKind,
      ids.secondaryNodeId.name,
    );

    /* If the component entry cannot be found in the Catalog, we can return the schema so far */
    if (!camelComponentDefinition) {
      return schema;
    }

    /* Filter out producer/consumer properties depending upon the endpoint usage */
    const actualComponentProperties = Object.fromEntries(
      Object.entries(camelComponentDefinition.propertiesSchema.properties ?? {}).filter(([, propertySchema]) => {
        if (ids.primaryNodeId?.name === 'from') {
          return !propertySchema.$comment?.includes('producer');
        } else {
          return !propertySchema.$comment?.includes('consumer');
        }
      }),
    );

    schema.properties ??= {};
    if (!schema.properties.parameters) {
      schema.properties.parameters = { type: 'object', properties: {} };
    }
    schema.properties.parameters.properties = actualComponentProperties;
    schema.properties.parameters.required = camelComponentDefinition.propertiesSchema.required;
    schema.properties.parameters['x-component-name'] = ids.secondaryNodeId.name;
    schema.properties.parameters['x-endpoint-catalog-kind'] = ids.secondaryNodeId.catalogKind;

    /* This would be a Kamelet definition being used by the kamelet component, f.i. `uri: kamelet:weather-action`, in case it's not, we can return the schema so far */
    if (ids.tertiaryNodeId?.catalogKind !== CatalogKind.Kamelet) {
      return schema;
    }

    const kameletDefinition = await DynamicCatalogRegistry.get().getEntity(
      ids.tertiaryNodeId.catalogKind,
      ids.tertiaryNodeId.name,
    );

    /* If the kamelet entry cannot be found in the Catalog, we can return the schema so far */
    if (!kameletDefinition) {
      return schema;
    }

    schema.properties.parameters = cloneDeep(kameletDefinition.spec.definition) as KaotoSchemaDefinition['schema'];
    schema.properties.parameters['x-kamelet-name'] = ids.tertiaryNodeId.name;
    schema.properties.parameters.type = 'object';

    return schema;
  }

  getNodeDefinition(path?: string, ids?: IVisualizationNodeIds): unknown {
    if (!path) return undefined;

    let definition = cloneDeep(getValue(this.entityDef, path));

    // String coercion: some processors store their value as a plain string
    const processorName = ids?.primaryNodeId?.name;
    if (processorName !== undefined) {
      const prop = CamelComponentSchemaService.PROCESSOR_STRING_DEFINITIONS[processorName];
      if (prop && typeof definition === 'string') {
        definition = { [prop]: definition };
      }
    }

    // Overriding parameters with an empty object when mistakenly set to null or undefined.
    // Guard with typeof check: the `in` operator throws a TypeError on string primitives.
    if (
      definition != null &&
      typeof definition === 'object' &&
      'parameters' in (definition as object) &&
      (definition as Record<string, unknown>).parameters == null
    ) {
      (definition as Record<string, unknown>).parameters = {};
    }

    return definition;
  }

  async getParsedDefinition(path?: string, ids?: IVisualizationNodeIds): Promise<unknown> {
    const definition = this.getNodeDefinition(path, ids);
    if (definition == null) return definition;

    const componentName =
      ids?.secondaryNodeId?.name === 'kamelet' && ids?.tertiaryNodeId?.name !== undefined
        ? `kamelet:${ids.tertiaryNodeId.name}`
        : ids?.secondaryNodeId?.name;

    if (!componentName) return definition;

    return uriDefinitionParser(componentName, definition as Record<string, unknown>);
  }

  getOmitFormFields(): string[] {
    return ['from', 'outputs', 'steps', 'when', 'otherwise', 'doCatch', 'doFinally'];
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.entityDef, path, value);
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
    insertAtStart?: boolean;
  }) {
    const defaultValue = CamelComponentDefaultService.getDefaultNodeDefinitionValue(options.definedComponent);
    this.addNewStep(defaultValue, options.mode, options.data, options.definedComponent.name, options.insertAtStart);
  }

  getCopiedContent(path?: string, ids?: IVisualizationNodeIds): IClipboardContent | undefined {
    if (!path || !ids?.primaryNodeId?.name) return;

    const componentModel = getValue(this.entityDef, path);

    return {
      name: ids.primaryNodeId.name,
      definition: componentModel,
    };
  }

  pasteStep(options: {
    clipboardContent: IClipboardContent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    insertAtStart?: boolean;
  }) {
    const { name, definition } = options.clipboardContent;
    const defaultValue = (SPECIAL_CHILD_PROCESSORS as readonly string[]).includes(name)
      ? (definition as ProcessorDefinition)
      : ({ [name]: definition } as ProcessorDefinition);
    this.addNewStep(defaultValue, options.mode, options.data, options.clipboardContent.name, options.insertAtStart);
  }

  canDragNode(path?: string) {
    if (!isDefined(path)) return false;

    return path !== 'route' && path !== 'route.from' && path !== 'template.from';
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
    const processorName = data.primaryNodeId?.name as keyof ProcessorDefinition;
    const canHavePreviousStep = ProcessorStepsService.canHavePreviousStep(processorName);
    const stepsProperties = ProcessorStepsService.getProcessorStepsProperties(processorName);
    const canHaveChildren = stepsProperties.some((property) => property.type === 'branch');
    const canHaveSpecialChildren = Object.keys(stepsProperties).length > 1;
    const canReplaceStep = ProcessorStepsService.canReplaceStep(processorName);
    const canRemoveFlow = data.path === this.getRootPath();
    const canRemoveStep = !canRemoveFlow && !CamelComponentSchemaService.DISABLED_REMOVE_STEPS.includes(processorName);
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

  async getNodeValidationText(
    path?: string | undefined,
    schema?: KaotoSchemaDefinition['schema'],
    ids?: IVisualizationNodeIds,
  ): Promise<string | undefined> {
    const definition = this.getNodeDefinition(path, ids);
    if (!schema || !definition) return undefined;

    return await ModelValidationService.validateNodeStatus(schema, definition);
  }

  async toVizNode(): Promise<IVisualizationNode> {
    const routeGroupNode = createVisualizationNode(this.getRootPath(), {
      name: this.type,
      path: this.getRootPath(),
      entity: this,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
      processorIconTooltip: '',
      processorName: 'route',
      schema: undefined,
      primaryNodeId: { name: this.type, catalogKind: CatalogKind.Entity } satisfies NodeIdentity,
    });

    const fromNode = await NodeMapperService.getVizNode(
      `${this.getRootPath()}.from`,
      {
        primaryNodeId: {
          name: 'from',
          catalogKind: CatalogKind.Entity,
        } satisfies NodeIdentity,
      },
      this.entityDef,
    );

    if (!this.getRootUri()) {
      fromNode.data.catalogKind = CatalogKind.Entity;
      fromNode.data.name = PlaceholderType.Placeholder;
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

      children.forEach((child) => {
        normalizeGroups(child);
      });
    };

    normalizeGroups(routeGroupNode);

    await NodeEnrichmentService.enrichVisualizationTree(routeGroupNode);

    return routeGroupNode;
  }

  private addNewStep(
    defaultValue: ProcessorDefinition,
    mode: AddStepMode,
    data: IVisualizationNodeData,
    childName: string,
    insertAtStart?: boolean,
  ) {
    if (data.path === undefined) return;
    const stepsProperties = ProcessorStepsService.getProcessorStepsProperties(
      data.primaryNodeId?.name as keyof ProcessorDefinition,
    );

    if (mode === AddStepMode.InsertChildStep || mode === AddStepMode.InsertSpecialChildStep) {
      this.insertChildStep(mode, data, childName, stepsProperties, defaultValue, insertAtStart);
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

  private getNodeLabelFromIds(
    ids: IVisualizationNodeIds | undefined,
    definition:
      | { id?: string; description?: string; uri?: string; parameters?: { name?: string } }
      | string
      | undefined,
    labelType?: NodeLabelType,
  ): string {
    const primaryName = ids?.primaryNodeId?.name ?? '';
    const secondaryName = ids?.secondaryNodeId?.name;
    const tertiaryName = ids?.tertiaryNodeId?.name;

    const defObj = typeof definition === 'string' ? undefined : definition;
    const id: string | undefined = defObj?.id;
    const description: string | undefined = defObj?.description;
    const uri: string | undefined = typeof definition === 'string' ? definition : defObj?.uri;

    if (labelType === NodeLabelType.Id && id) return id;
    if (description) return description;

    if (secondaryName !== undefined) {
      if (secondaryName === 'direct') {
        return getValue(definition, 'parameters.name') ?? secondaryName;
      }
      if (secondaryName === 'kamelet' && tertiaryName !== undefined) {
        return `kamelet:${tertiaryName}`;
      }
      return secondaryName;
    }

    switch (primaryName) {
      case 'route':
      case 'errorHandler':
      case 'onException':
      case 'onCompletion':
      case 'intercept':
      case 'interceptFrom':
      case 'interceptSendToEndpoint':
      case 'step':
        return id ?? primaryName;

      case 'from':
        return uri || 'from: Unknown';

      default:
        return primaryName;
    }
  }

  private insertChildStep(
    mode: AddStepMode,
    data: IVisualizationNodeData,
    childName: string,
    stepsProperties: CamelProcessorStepsProperties[],
    defaultValue: ProcessorDefinition = {},
    insertAtStart?: boolean,
  ) {
    const property = stepsProperties.find((property) =>
      mode === AddStepMode.InsertChildStep ? 'steps' : childName === property.name,
    );
    if (property === undefined) return;

    if (property.type === 'single-clause') {
      setValue(this.entityDef, `${data.path}.${property.name}`, defaultValue);
    } else {
      const arrayPath: ProcessorDefinition[] = getArrayProperty(this.entityDef, `${data.path}.${property.name}`);
      const addAtStart = insertAtStart ?? mode === AddStepMode.InsertChildStep;
      addAtStart ? arrayPath.unshift(defaultValue) : arrayPath.push(defaultValue);
    }
  }
}
