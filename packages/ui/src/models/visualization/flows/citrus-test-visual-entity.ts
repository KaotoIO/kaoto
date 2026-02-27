import { isDefined } from '@kaoto/forms';
import { cloneDeep } from 'lodash';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getArrayProperty, getValue, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { sourceSchemaConfig } from '../../camel/source-schema-config';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { DefinedComponent } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { Test, TestAction, TestActions } from '../../citrus/entities/Test';
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
import { CitrusTestDefaultService } from './support/citrus-test-default.service';
import { CitrusTestContainerSettings, CitrusTestSchemaService } from './support/citrus-test-schema.service';
import { ModelValidationService } from './support/validators/model-validation.service';

/**
 * Type guard to determine whether an object is a Citrus Test.
 *
 * Performs a basic structural check for required properties:
 * - Must be a non-array object
 * - Must have more than one property
 * - Must have 'name' and 'actions' properties
 *
 * @param rawEntity - The object to check
 * @returns True if the object appears to be a Citrus Test
 */
export const isCitrusTest = (rawEntity: unknown): rawEntity is Test => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  const objectKeys = Object.keys(rawEntity!);

  return objectKeys.length > 1 && 'name' in rawEntity! && 'actions' in rawEntity!;
};

/**
 * Creates a default Citrus test with basic structure.
 *
 * The default test includes:
 * - A name
 * - An empty variables array
 * - Two sample actions: createVariables and print
 *
 * @param name - The name for the test
 * @returns A Test object with default structure
 */
const getDefaultTest = (name: string): Test => {
  return {
    name: `${name}`,
    variables: [],
    actions: [
      {
        createVariables: { variables: [{ name: 'user', value: 'Citrus' }] },
      },
      {
        print: { message: 'Hello from ${user}' },
      },
    ],
  };
};

/**
 * Visual entity representation of a Citrus test in the Kaoto editor.
 *
 * This class implements BaseVisualCamelEntity to provide visual representation
 * and manipulation capabilities for Citrus tests. It handles:
 * - Converting test definitions to visualization nodes
 * - Managing test actions and their hierarchy
 * - Providing schemas for property forms
 * - Handling add/remove/update operations on test actions
 * - Supporting drag-and-drop and copy-paste operations
 *
 * The visual entity manages the complete lifecycle of a Citrus test in the editor,
 * including nested containers and action groups.
 */
export class CitrusTestVisualEntity implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.Test;
  static readonly ROOT_PATH = 'test';

  constructor(public test: Test) {
    this.id = test?.name ?? getCamelRandomId('test');
    if (!this.test) {
      this.test = getDefaultTest(this.id);
      this.test.name = this.id;
    }
  }

  /**
   * Gets the root path for this entity in the visualization tree.
   */
  getRootPath(): string {
    return CitrusTestVisualEntity.ROOT_PATH;
  }

  /**
   * Type guard to check if a definition is applicable for this entity type.
   *
   * @param testDef - The definition to check
   * @returns True if the definition is a valid Citrus test
   */
  static isApplicable(testDef: unknown): testDef is Test {
    return isCitrusTest(testDef);
  }

  /** Internal API methods */
  getId(): string {
    return this.id;
  }

  setId(testName: string): void {
    this.id = testName;
    this.test.name = this.id;
  }

  /**
   * Gets the display label for a node at the given path.
   *
   * For the root path, returns the test ID.
   * For action paths, extracts and formats the action name.
   *
   * @param path - The path to the node in the visualization tree
   * @returns The display label for the node
   */
  getNodeLabel(path?: string): string {
    if (!path) return '';

    if (path === this.getRootPath()) {
      return this.id;
    }

    const name = path.split('.').pop() || '';
    const tokens = name.split('-');
    if (tokens.length > 2) {
      return tokens.slice(1).join('-');
    } else if (tokens.length > 1 && name.length > 18) {
      // name too long - use shortcut
      return tokens.pop() || '';
    }

    return name;
  }

  getNodeTitle(path?: string): string {
    if (!path) return '';

    if (path === this.getRootPath()) {
      return 'Test';
    }

    const actionName = CitrusTestSchemaService.extractTestActionName(path);
    return CitrusTestSchemaService.getNodeTitle(actionName);
  }

  getTooltipContent(path?: string): string {
    if (!path) return '';

    if (path === this.getRootPath()) {
      return 'Test';
    }

    const actionName = CitrusTestSchemaService.extractTestActionName(path);
    const actionModel: TestAction = getValue(this.test, this.toModelPath(path));
    return CitrusTestSchemaService.getTooltipContent(actionName, actionModel);
  }

  getNodeSchema(path?: string): KaotoSchemaDefinition['schema'] | undefined {
    if (!path) return undefined;
    if (path === this.getRootPath()) {
      return this.getRootTestSchema();
    }

    const actionName = CitrusTestSchemaService.extractTestActionName(path);
    const actionModel: TestAction = getValue(this.test, this.toModelPath(path));

    this.updateTestActionModel(path, actionName, actionModel);
    return CitrusTestSchemaService.getNodeSchema(actionName, actionModel);
  }

  getNodeDefinition(path?: string): unknown {
    if (!path) return undefined;
    if (path === this.getRootPath()) {
      return this.test;
    }

    const actionName = CitrusTestSchemaService.extractTestActionName(path);
    const actionModel: TestAction = getValue(this.test, this.toModelPath(path));

    if (actionModel) {
      this.updateTestActionModel(path, actionName, actionModel);
    }

    return actionModel ?? {};
  }

  getOmitFormFields(): string[] {
    return [];
  }

  toJSON(): Test {
    this.updateTestGroupModel(this.test!.actions);
    return this.test;
  }

  updateModel(path: string | undefined, value: Record<string, unknown>): void {
    if (!path) return;

    if (path === this.getRootPath()) {
      this.id = this.test.name as string;
    }

    setValue(this.test, path, value);

    return;
  }

  /**
   * Adds a test action step to the test.
   *
   * Creates a default action definition from the catalog component and adds it
   * to the test at the appropriate location based on the mode and target data.
   *
   * Path examples:
   * - 'variables'
   * - 'actions.0'
   * - 'actions.1.iterate.0'
   *
   * @param options - Configuration options for adding the step including
   * - The catalog component definition to add
   * - How to add the step (append, prepend, or replace)
   * - Visualization node data indicating where to add the step
   */
  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
  }) {
    const action = CitrusTestDefaultService.getDefaultTestActionDefinitionValue(options.definedComponent);
    this.addNewStep(action, options.mode, options.data);
  }

  getCopiedContent(path?: string) {
    if (!path) return;

    const actionName = CitrusTestSchemaService.extractTestActionName(path);
    const actionModel: TestActions = getValue(this.test, this.toModelPath(path.substring(0, path.lastIndexOf('.'))));
    return { type: SourceSchemaType.Test, name: actionName, definition: actionModel as object };
  }

  /**
   * Pastes a copied test action step into the test.
   *
   * @param options - Configuration options for pasting the step including
   * - The copied content to paste
   * - How to add the step (append, prepend, or replace)
   * - Visualization node data indicating where to paste
   */
  pasteStep(options: { clipboardContent: IClipboardCopyObject; mode: AddStepMode; data: IVisualizationNodeData }) {
    const action = options.clipboardContent.definition as TestActions;
    this.addNewStep(action, options.mode, options.data);
  }

  canDragNode(path?: string) {
    return isDefined(path);
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
     * f.i. actions.1.soap-assertFault.when.myAction
     * last: myAction
     * penultimate: when
     */
    if (!Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate))) {
      const action = getValue(this.test, this.toModelPath(pathArray.slice(0, -2).join('.')), []);
      setValue(action, penultimate, undefined);
      return;
    }

    /**
     * If the last segment is a number, it means the target object is a member of an array
     * therefore we need to look for the array and remove the element at the given index
     *
     * f.i. actions.1.iterate.0
     * last: 0
     */
    let array = getValue(this.test, this.toModelPath(pathArray.slice(0, -1).join('.')), []);
    if (Number.isInteger(Number(last)) && Array.isArray(array)) {
      array.splice(Number(last), 1);

      return;
    }

    /**
     * If the last segment is a word and the penultimate is a number, it means the target is an object
     * potentially a Processor, that belongs to an array, therefore we remove it entirely
     *
     * f.i. actions.1.iterate
     * last: iterate
     * penultimate: 1
     */
    array = getValue(this.test, this.toModelPath(pathArray.slice(0, -2).join('.')), []);
    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate)) && Array.isArray(array)) {
      array.splice(Number(penultimate), 1);

      return;
    }
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    return {
      /** Test cannot have actions before the variables declaration */
      canHavePreviousStep: data.path !== this.getRootPath() && data.path !== 'variables',
      /** Test cannot have actions after the finally block */
      canHaveNextStep: data.path !== 'finally',
      canHaveChildren: data.isGroup ?? false,
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

  getGroupIcons(): { icon: string; title: string }[] {
    return [];
  }

  toVizNode(): IVisualizationNode {
    const testGroupNode = createVisualizationNode(this.id, {
      catalogKind: CatalogKind.TestAction,
      name: this.type,
      path: this.getRootPath(),
      entity: this,
      isGroup: true,
    });

    const actionNodes = this.getVizNodesFromSteps(this.test!.actions, this.getRootPath());
    actionNodes.forEach((actionNode) => {
      testGroupNode.addChild(actionNode);
    });
    return testGroupNode;
  }

  private addNewStep(action: TestActions, mode: AddStepMode, data: IVisualizationNodeData) {
    const path = data.path;
    if (!path) return;

    const pathArray = path.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    /**
     * If the last segment is a string and the penultimate is a number, it means the target is member of an array
     * therefore we need to look for the array and insert the element at the given index + 1
     *
     * f.i. actions.0.echo
     * penultimate: 0
     * last: echo
     */
    if (!Number.isInteger(Number(last)) && Number.isInteger(Number(penultimate))) {
      /** If we're in Append mode, we need to insert the step after the selected index hence `Number(penultimate) + 1` */
      const desiredStartIndex = mode === AddStepMode.AppendStep ? Number(penultimate) + 1 : Number(penultimate);

      /** If we're in Replace mode, we need to delete the existing step */
      const deleteCount = mode === AddStepMode.ReplaceStep ? 1 : 0;

      const array: TestActions[] = getArrayProperty(this.test!, this.toModelPath(pathArray.slice(0, -2).join('.')));
      array.splice(desiredStartIndex, deleteCount, action);

      return;
    }

    /**
     * If the last segment is a string and the penultimate is a string, too, it means the target is a single nested node
     * therefore we need to look for the parent container and insert.
     *
     * f.i. actions.catch.when.placeholder
     * penultimate: when
     * last: placeholder
     */
    if (!Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate))) {
      /** Whatever mode append or replace, we replace the current node as we have a single nested node */
      setValue(this.test, this.toModelPath(path.substring(0, path.lastIndexOf('.'))), action);
      return;
    }

    /**
     * If the last segment is a number and the penultimate is a string, it also means the target is member of an array
     *
     * f.i. actions.0.iterate.0
     * penultimate: iterate
     * last: 0
     */
    if (Number.isInteger(Number(last)) && !Number.isInteger(Number(penultimate))) {
      /** If we're in Append mode, we need to insert the step after the selected index hence `Number(last) + 1` */
      const desiredStartIndex = mode === AddStepMode.AppendStep ? Number(last) + 1 : Number(last);

      /** If we're in Replace mode, we need to delete the existing step */
      const deleteCount = mode === AddStepMode.ReplaceStep ? 1 : 0;

      const array: TestActions[] = getArrayProperty(this.test!, this.toModelPath(pathArray.slice(0, -1).join('.')));
      array.splice(desiredStartIndex, deleteCount, action);
    }
  }

  private getVizNodeFromStep(action: TestActions, path: string): IVisualizationNode {
    const actionName = CitrusTestSchemaService.getTestActionName(action);
    const data: IVisualizationNodeData = {
      catalogKind: CatalogKind.TestAction,
      name: actionName,
      path,
      entity: this,
    };

    const vizNode = createVisualizationNode(path, data);

    const containerSettings = CitrusTestSchemaService.getTestContainerSettings(actionName);
    if (containerSettings) {
      vizNode.data.isGroup = true;

      const childrenVizNodes = this.getVizNodesFromChildren(this.toModelPath(path), containerSettings);

      childrenVizNodes.forEach((childVizNode) => {
        vizNode.addChild(childVizNode);
      });
    }

    return vizNode;
  }

  private getVizNodesFromSteps(actions: TestActions[] = [], path: string): IVisualizationNode[] {
    const actionsPath = path === this.getRootPath() ? 'actions' : path;
    const vizNodes = actions.reduce((acc, action, index) => {
      const actionName = CitrusTestSchemaService.getTestActionName(action);
      const vizNode = this.getVizNodeFromStep(action, `${actionsPath}.${index}.${actionName}`);

      const previousVizNode = acc[acc.length - 1];
      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      acc.push(vizNode);
      return acc;
    }, [] as IVisualizationNode[]);

    /** Empty steps branch placeholder */
    const placeholderPath = `${actionsPath}.${vizNodes.length}.placeholder`;
    const previousNode = vizNodes[vizNodes.length - 1];
    const placeholderNode = createVisualizationNode(placeholderPath, {
      catalogKind: CatalogKind.TestAction,
      name: 'placeholder',
      isPlaceholder: true,
      path: placeholderPath,
    });
    vizNodes.push(placeholderNode);

    if (previousNode) {
      previousNode.setNextNode(placeholderNode);
      placeholderNode.setPreviousNode(previousNode);
    }
    return vizNodes;
  }

  private getRootTestSchema(): KaotoSchemaDefinition['schema'] {
    const testSchemaDef = sourceSchemaConfig.config[SourceSchemaType.Test]?.schema;
    const schema = cloneDeep(testSchemaDef?.schema || ({} as unknown as KaotoSchemaDefinition['schema']));

    if (schema.properties) {
      // remove actions and finally from test schema because the properties panel should not display those items.
      schema.properties['actions'] = {} as unknown as KaotoSchemaDefinition['schema'];
      schema.properties['finally'] = {} as unknown as KaotoSchemaDefinition['schema'];
    }

    return schema;
  }

  protected getVizNodesFromChildren(
    path: string,
    containerSettings: CitrusTestContainerSettings,
  ): IVisualizationNode[] {
    const subpath = `${path}.${containerSettings.name}`;
    switch (containerSettings.type) {
      case 'single-node':
        return this.getChildrenFromSingleClause(subpath);

      case 'branch':
        return this.getChildrenFromBranch(subpath);

      case 'array-node':
        return this.getChildrenFromArrayClause(subpath);

      default:
        return [];
    }
  }

  protected getChildrenFromSingleClause(path: string): IVisualizationNode[] {
    const action: TestActions = getValue(this.test, path);
    if (action === undefined) {
      /** Empty steps branch placeholder */
      const placeholderPath = `${path}.placeholder`;
      const placeholderNode = createVisualizationNode(placeholderPath, {
        catalogKind: CatalogKind.TestAction,
        name: 'placeholder',
        isPlaceholder: true,
        path: placeholderPath,
      });
      return [placeholderNode];
    }

    const actionName = CitrusTestSchemaService.getTestActionName(action);
    return [this.getVizNodeFromStep(action, `${path}.${actionName}`)];
  }

  protected getChildrenFromBranch(path: string): IVisualizationNode[] {
    const actions: TestActions[] = getValue(this.test, path, []);
    return this.getVizNodesFromSteps(actions, path);
  }

  protected getChildrenFromArrayClause(path: string): IVisualizationNode[] {
    const actions: TestActions[] = getValue(this.test, path, []);
    const vizNodes = actions.reduce((acc, action, index) => {
      const actionName = CitrusTestSchemaService.getTestActionName(action);
      const vizNode = this.getVizNodeFromStep(action, `${path}.${index}.${actionName}`);
      acc.push(vizNode);
      return acc;
    }, [] as IVisualizationNode[]);

    /** Empty steps branch placeholder */
    const placeholderPath = `${path}.${vizNodes.length}.placeholder`;
    const previousNode = vizNodes[vizNodes.length - 1];
    const placeholderNode = createVisualizationNode(placeholderPath, {
      catalogKind: CatalogKind.TestAction,
      name: 'placeholder',
      isPlaceholder: true,
      path: placeholderPath,
    });
    vizNodes.push(placeholderNode);

    if (previousNode) {
      previousNode.setNextNode(placeholderNode);
      placeholderNode.setPreviousNode(previousNode);
    }

    return vizNodes;
  }

  private toModelPath(path: string) {
    return path.replace(/-/g, '.');
  }

  /**
   * Enhance the provided action model with properties set on the parent test action groups.
   * Goes through the list of parent groups if any and sets the properties directly on the action model.
   */
  private updateTestActionModel(path: string, actionName: string, actionModel: TestAction) {
    const actionDefinition = CitrusTestSchemaService.getTestActionDefinition(actionName);
    if (isDefined(actionDefinition?.group)) {
      const groups = CitrusTestSchemaService.getTestActionGroups(actionDefinition) || [];
      const basePath = path.split('.').slice(0, -1).join('.');
      let groupPath = '';
      for (const group of groups) {
        groupPath = groupPath.length === 0 ? group.name : `${groupPath}.${group.name}`;
        if (group.propertiesSchema?.properties) {
          for (const [key, _schema] of Object.entries(group.propertiesSchema.properties)) {
            const value = getValue(this.test, `${basePath}.${groupPath}.${key}`, undefined);
            if (isDefined(value)) {
              // set value to action node
              setValue(actionModel, key, value);
            }
          }
        }
      }
    }
  }

  /**
   * Go through the list of test actions and rebuild proper test action group hierarchy.
   * Properties that belong to the test action group are removed from the test action model.
   */
  private updateTestGroupModel(actions: TestActions[]): void {
    for (const action of actions) {
      const actionName = CitrusTestSchemaService.getTestActionName(action);
      const actionDefinition = CitrusTestSchemaService.getTestActionDefinition(actionName);
      if (isDefined(actionDefinition?.group)) {
        const groups = CitrusTestSchemaService.getTestActionGroups(actionDefinition) || [];
        let groupPath = '';
        for (const group of groups) {
          groupPath = groupPath.length === 0 ? group.name : `${groupPath}.${group.name}`;
          if (group.propertiesSchema?.properties) {
            for (const [key, _schema] of Object.entries(group.propertiesSchema.properties)) {
              const value = getValue(action, `${this.toModelPath(actionName)}.${key}`, undefined);
              if (isDefined(value)) {
                // remove the original value set in child node
                setValue(action, `${this.toModelPath(actionName)}.${key}`, undefined);
                // set value to parent group node instead
                setValue(action, `${groupPath}.${key}`, value);
              }
            }
          }
        }
      }

      const containerSettings = CitrusTestSchemaService.getTestContainerSettings(actionName);
      if (containerSettings) {
        const nested: TestActions[] = getValue(action, `${this.toModelPath(actionName)}.${containerSettings.name}`, []);
        if (nested.length) {
          this.updateTestGroupModel(nested);
        }
      }
    }
  }
}
