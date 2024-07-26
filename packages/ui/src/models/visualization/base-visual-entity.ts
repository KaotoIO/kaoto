import { DefinedComponent } from '../camel-catalog-index';
import { BaseCamelEntity, EntityType } from '../camel/entities';
import { KaotoSchemaDefinition } from '../kaoto-schema';

/**
 * BaseVisualCamelEntity
 *
 * This interface is used to represent a visual Camel entity.
 * f.i. Camel Route, Kamelet, KameletBinding, etc.
 * All dedicated Camel code should be implemented using this interface.
 */
export interface BaseVisualCamelEntity extends BaseCamelEntity {
  id: string;
  type: EntityType;

  getId: () => string;

  setId: (id: string) => void;

  /** Given a path, get the component label */
  getNodeLabel: (path?: string, labelType?: string) => string;

  /** Given a path, get the component tooltip content */
  getTooltipContent: (path?: string) => string;

  /** Given a path, get the component type and definition */
  getComponentSchema: (path?: string) => VisualComponentSchema | undefined;

  /** Returnt fields that should be omitted when configuring this entity */
  getOmitFormFields: () => string[];

  /** Given a path, update the model */
  updateModel(path: string | undefined, value: unknown): void;

  /** Add a step to the underlying Camel entity */
  addStep: (options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
  }) => void;

  /** Remove the step at a given path from the underlying Camel entity */
  removeStep: (path?: string) => void;

  /** Returns the NodeInteraction information so the UI can show whether this node can have children and/or siblings */
  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction;

  /** Given a path, retrieve the Node validation status */
  getNodeValidationText(path?: string): string | undefined;

  /** Generates a IVisualizationNode from the underlying Camel entity */
  toVizNode: () => IVisualizationNode;
}

export interface BaseVisualCamelEntityConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): BaseVisualCamelEntity;
  isApplicable: (entity: unknown) => boolean;
}

/**
 * IVisualizationNode
 *
 * This interface is used to represent a node in the visualization tree.
 * Usually, each IVisualizationNode represent a component in a BaseVisualCamelEntity.
 *
 * This interface shouldn't know anything about the specific BaseVisualCamelEntity.
 */
export interface IVisualizationNode<T extends IVisualizationNodeData = IVisualizationNodeData> {
  id: string;
  data: T;

  /** This property is only set on the root node */
  getBaseEntity(): BaseVisualCamelEntity | undefined;

  /** This method returns the label to be used by the canvas nodes */
  getNodeLabel(labelType?: string): string;

  /** This method returns the tooltip content to be used by the canvas nodes */
  getTooltipContent(): string;

  addBaseEntityStep(definedComponent: DefinedComponent, mode: AddStepMode, targetProperty?: string): void;

  getNodeInteraction(): NodeInteraction;

  getComponentSchema(): VisualComponentSchema | undefined;

  updateModel(value: unknown): void;

  getParentNode(): IVisualizationNode | undefined;

  setParentNode(parentNode?: IVisualizationNode): void;

  getPreviousNode(): IVisualizationNode | undefined;

  setPreviousNode(previousNode: IVisualizationNode): void;

  getNextNode(): IVisualizationNode | undefined;

  setNextNode(node: IVisualizationNode): void;

  getChildren(): IVisualizationNode[] | undefined;

  addChild(child: IVisualizationNode): void;

  removeChild(): void;

  populateLeafNodesIds(ids: string[]): void;

  /** Retrieve the node's validation status, relying into the underlying entity */
  getNodeValidationText(): string | undefined;
}

export interface IVisualizationNodeData {
  icon?: string;
  path?: string;
  entity?: BaseVisualCamelEntity;
  isPlaceholder?: boolean;
  isGroup?: boolean;
  [key: string]: unknown;
}

/**
 * VisualComponentSchema
 *
 * This interface is used to represent a component through
 * the name and the schema of the component.
 */
export interface VisualComponentSchema {
  title: string;
  schema: KaotoSchemaDefinition['schema'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  definition: any;
}

export const enum AddStepMode {
  /** Used to append a new step before an existing step */
  PrependStep = 'prepend-step',
  /** Used to append a new step after an existing step */
  AppendStep = 'append-step',
  /** Used to replace an existing step */
  ReplaceStep = 'replace-step',
  /**
   * Used to insert a new step in the step property.
   * for instance, for adding steps to the `from` or `doTry` processor
   */
  InsertChildStep = 'insert-step',
  /**
   * Used to insert a new special step in a special step property.
   * for instance, for adding `when` clauses to the `choice.when` property,
   * or to add `doCatch` clauses to the `doTry.doCath` property
   */
  InsertSpecialChildStep = 'insert-special-step',
}

export interface NodeInteraction {
  canHavePreviousStep: boolean;
  canHaveNextStep: boolean;
  canHaveChildren: boolean;
  canHaveSpecialChildren: boolean;
  canReplaceStep: boolean;
  canRemoveStep: boolean;
  canRemoveFlow: boolean;
  canBeDisabled: boolean;
}
