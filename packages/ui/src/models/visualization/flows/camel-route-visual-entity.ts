/* eslint-disable no-case-declarations */
import { DoCatch, FromDefinition, ProcessorDefinition, RouteDefinition, When1 } from '@kaoto-next/camel-catalog/types';
import get from 'lodash.get';
import set from 'lodash.set';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getArrayProperty, isDefined } from '../../../utils';
import { NodeIconResolver } from '../../../utils/node-icon-resolver';
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
import {
  CamelProcessorStepsProperties,
  CamelRouteVisualEntityData,
  ICamelElementLookupResult,
} from './support/camel-component-types';

/** Very basic check to determine whether this object is a Camel Route */
export const isCamelRoute = (rawEntity: unknown): rawEntity is { route: RouteDefinition } => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  const objectKeys = Object.keys(rawEntity!);

  return (
    objectKeys.length === 1 &&
    'route' in rawEntity! &&
    typeof rawEntity.route === 'object' &&
    'from' in rawEntity.route!
  );
};

/** Very basic check to determine whether this object is a Camel From */
export const isCamelFrom = (rawEntity: unknown): rawEntity is { from: FromDefinition } => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  const objectKeys = Object.keys(rawEntity!);
  const isFromHolder = objectKeys.length === 1 && objectKeys[0] === 'from';
  const isValidUriField = typeof (rawEntity as { from: FromDefinition })?.from?.uri === 'string';
  const isValidStepsArray = Array.isArray((rawEntity as { from: FromDefinition })?.from?.steps);

  return isFromHolder && isValidUriField && isValidStepsArray;
};

export class CamelRouteVisualEntity implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.Route;

  constructor(public route: RouteDefinition) {
    this.id = route.id ?? getCamelRandomId('route');
    this.route.id = this.id;
  }
  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.route.id = this.id;
  }

  getId(): string {
    return this.id;
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;

    const componentModel = get(this.route, path);
    const visualComponentSchema = CamelComponentSchemaService.getVisualComponentSchema(path, componentModel);

    return visualComponentSchema;
  }

  toJSON() {
    return { route: this.route };
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    set(this.route, path, value);
  }

  getSteps(): ProcessorDefinition[] {
    return this.route.from?.steps ?? [];
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

    /** Replace the root `from` step */
    if (options.mode === AddStepMode.ReplaceStep && options.data.path === 'from' && isDefined(this.route.from)) {
      const fromValue = CamelComponentDefaultService.getDefaultFromDefinitionValue(options.definedComponent);
      Object.assign(this.route.from, fromValue);
      return;
    } else if (options.mode === AddStepMode.InsertChildStep || options.mode === AddStepMode.InsertSpecialChildStep) {
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

      const stepsArray: ProcessorDefinition[] = get(this.route, pathArray.slice(0, -2), []);
      stepsArray.splice(desiredStartIndex, deleteCount, defaultValue);

      return;
    }
  }

  removeStep(path?: string): void {
    if (!path) return;
    /**
     * If there's only one path segment, it means the target is the `from` property of the route
     * therefore we replace it with an empty object
     */
    if (path === 'from') {
      set(this.route, 'from.uri', '');
      return;
    }

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
    let array = get(this.route, pathArray.slice(0, -1), []);
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
    array = get(this.route, pathArray.slice(0, -2), []);
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
    const object = get(this.route, pathArray.slice(0, -1), {});
    if (!Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate)) && typeof object === 'object') {
      delete object[last];
    }
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      (data as CamelRouteVisualEntityData).processorName as keyof ProcessorDefinition,
    );
    const canHavePreviousStep = CamelComponentSchemaService.canHavePreviousStep(
      (data as CamelRouteVisualEntityData).processorName,
    );
    const canHaveChildren = stepsProperties.find((property) => property.type === 'branch') !== undefined;
    const canHaveSpecialChildren = Object.keys(stepsProperties).length > 1;

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
    };
  }

  toVizNode(): IVisualizationNode {
    const rootNode = this.getVizNodeFromProcessor('from', {
      processorName: 'from' as keyof ProcessorDefinition,
      componentName: CamelComponentSchemaService.getComponentNameFromUri(this.route.from!.uri),
    });
    rootNode.data.entity = this;

    if (!this.route.from?.uri) {
      rootNode.data.label = 'from: Unknown';
      rootNode.data.icon = NodeIconResolver.getPlaceholderIcon();
    }

    return rootNode;
  }

  private getVizNodeFromProcessor(path: string, componentLookup: ICamelElementLookupResult): IVisualizationNode {
    const data: CamelRouteVisualEntityData = {
      label: CamelComponentSchemaService.getLabel(componentLookup, get(this.route, path)),
      path,
      icon: NodeIconResolver.getIcon(CamelComponentSchemaService.getIconName(componentLookup)),
      processorName: componentLookup.processorName,
      componentName: componentLookup.componentName,
    };

    const vizNode = createVisualizationNode(data);

    const childrenStepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      componentLookup.processorName as keyof ProcessorDefinition,
    );

    childrenStepsProperties.forEach((stepsProperty) => {
      const childrenVizNodes = this.getVizNodesFromChildren(path, stepsProperty);
      childrenVizNodes.forEach((childVizNode) => vizNode.addChild(childVizNode));
    });

    return vizNode;
  }

  private getVizNodesFromChildren(path: string, stepsProperty: CamelProcessorStepsProperties): IVisualizationNode[] {
    let singlePath: string;

    switch (stepsProperty.type) {
      case 'branch':
        singlePath = `${path}.${stepsProperty.name}`;
        const stepsList = get(this.route, singlePath, []) as ProcessorDefinition[];

        return stepsList.reduce((accStepsNodes, step, index) => {
          const singlePropertyName = Object.keys(step)[0];
          const childPath = `${singlePath}.${index}.${singlePropertyName}`;
          const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(
            childPath,
            get(step, singlePropertyName),
          );

          const vizNode = this.getVizNodeFromProcessor(childPath, childComponentLookup);

          const previousVizNode = accStepsNodes[accStepsNodes.length - 1];
          if (previousVizNode !== undefined) {
            previousVizNode.setNextNode(vizNode);
            vizNode.setPreviousNode(previousVizNode);
          }

          accStepsNodes.push(vizNode);
          return accStepsNodes;
        }, [] as IVisualizationNode[]);

      case 'single-clause':
        const childPath = `${path}.${stepsProperty.name}`;
        const childComponentLookup = CamelComponentSchemaService.getCamelComponentLookup(childPath, this.route);

        /** If the single-clause property is not defined, we don't create a IVisualizationNode for it */
        if (get(this.route, childPath) === undefined) return [];

        return [this.getVizNodeFromProcessor(childPath, childComponentLookup)];

      case 'clause-list':
        singlePath = `${path}.${stepsProperty.name}`;
        const expressionList = get(this.route, singlePath, []) as When1[] | DoCatch[];

        return expressionList.map((_step, index) => {
          const childPath = `${singlePath}.${index}`;
          const childComponentLookup = { processorName: stepsProperty.name as keyof ProcessorDefinition }; // when, doCatch

          return this.getVizNodeFromProcessor(childPath, childComponentLookup);
        });

      default:
        return [];
    }
  }

  private insertChildStep(
    options: Parameters<CamelRouteVisualEntity['addStep']>[0],
    stepsProperties: CamelProcessorStepsProperties[],
    defaultValue: ProcessorDefinition = {},
  ) {
    const property = stepsProperties.find((property) =>
      options.mode === AddStepMode.InsertChildStep ? 'steps' : options.definedComponent.name === property.name,
    );
    if (property === undefined) return;

    if (property.type === 'single-clause') {
      set(this.route, `${options.data.path}.${property.name}`, defaultValue);
    } else {
      const arrayPath = getArrayProperty(this.route, `${options.data.path}.${property.name}`);
      arrayPath.unshift(defaultValue);
    }
  }
}
