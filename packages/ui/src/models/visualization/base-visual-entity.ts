import { IClipboardCopyObject } from '../../components/Visualization/Custom/hooks/copy-step.hook';
import { DefinedComponent } from '../camel-catalog-index';
import { BaseCamelEntity, EntityType } from '../camel/entities';
import { KaotoSchemaDefinition } from '../kaoto-schema';
import { NodeLabelType } from '../settings/settings.model';
import { CanvasEdge } from '../../components/Visualization/Canvas';

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

  /** Return the root path of the entity */
  getRootPath: () => string;

  getId: () => string;

  setId: (id: string) => void;

  /** Given a path, get the component label */
  getNodeLabel: (path?: string, labelType?: NodeLabelType) => string;

  /** Given a path, get the component title from the catalog */
  getNodeTitle: (path?: string) => string;

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

  /** Given a path, get the content to be copied */
  getCopiedContent: (path?: string) => IClipboardCopyObject | undefined;

  pasteStep: (options: {
    clipboardContent: IClipboardCopyObject;
    mode: AddStepMode;
    data: IVisualizationNodeData;
  }) => void;

  /** Check if the node is draggable */
  canDragNode: (path?: string) => boolean;

  /** Check if the node is droppable */
  canDropOnNode: (path?: string) => boolean;

  /** Switch steps */
  moveNodeTo: (options: { draggedNodePath: string; droppedNodePath?: string }) => void;

  /** Remove the step at a given path from the underlying Camel entity */
  removeStep: (path?: string) => void;

  /** Returns the NodeInteraction information so the UI can show whether this node can have children and/or siblings */
  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction;

  /** Given a path, retrieve the Node validation status */
  getNodeValidationText(path?: string): string | undefined;

  /** Generates a IVisualizationNode from the underlying Camel entity */
  toVizNode: () => VizNodesWithEdges;
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
  lastUpdate: number;

  getId(): string | undefined;

  /** This method returns the label to be used by the canvas nodes */
  getNodeLabel(labelType?: NodeLabelType): string;

  /** This method returns the tooltip content to be used by the canvas nodes */
  getTooltipContent(): string;

  /** This method returns the title used by the CanvasForm component */
  getNodeTitle(): string;

  addBaseEntityStep(definedComponent: DefinedComponent, mode: AddStepMode, targetProperty?: string): void;

  /** This method return the content to be copied for the node */
  getCopiedContent(): IClipboardCopyObject | undefined;

  pasteBaseEntityStep(definedComponent: IClipboardCopyObject, mode: AddStepMode): void;

  canDragNode(): boolean;

  canDropOnNode(): boolean;

  moveNodeTo(path: string): void;

  getNodeInteraction(): NodeInteraction;

  getComponentSchema(): VisualComponentSchema | undefined;

  /** Returnt fields that should be omitted when configuring this entity */
  getOmitFormFields(): string[];

  updateModel(value: unknown): void;

  getParentNode(): IVisualizationNode | undefined;

  setParentNode(parentNode?: IVisualizationNode): void;

  getPreviousNode(): IVisualizationNode | undefined;

  setPreviousNode(previousNode?: IVisualizationNode): void;

  getNextNode(): IVisualizationNode | undefined;

  setNextNode(node?: IVisualizationNode): void;

  getEndNodes(): IVisualizationNode[];

  setEndNodes(endNodes: IVisualizationNode[]): void;

  appendEndNodes(...endNode: IVisualizationNode[]): void;

  getChildren(): IVisualizationNode[] | undefined;

  addChild(child: IVisualizationNode): void;

  removeChild(): void;

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

export const DISABLED_NODE_INTERACTION: NodeInteraction = {
  canHavePreviousStep: false,
  canHaveNextStep: false,
  canHaveChildren: false,
  canHaveSpecialChildren: false,
  canReplaceStep: false,
  canRemoveStep: false,
  canRemoveFlow: false,
  canBeDisabled: false,
};

export type VizNodesWithEdges = {
  nodes: IVisualizationNode[];
  edges: CanvasEdge[];
};
