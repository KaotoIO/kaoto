import { action, makeObservable, observable } from 'mobx';
import { DefinedComponent } from '../camel-catalog-index';
import { NodeLabelType } from '../settings/settings.model';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  DISABLED_NODE_INTERACTION,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from './base-visual-entity';
import { IClipboardCopyObject } from '../../components/Visualization/Custom/hooks/copy-step.hook';

export const createVisualizationNode = <T extends IVisualizationNodeData = IVisualizationNodeData>(
  id: string,
  data: T,
): IVisualizationNode<T> => {
  return new VisualizationNode(id, data);
};

/**
 * VisualizationNode
 * This class is used to represent a node in the visualization tree.
 * It shouldn't be used directly, but rather through the IVisualizationNode interface.
 */
class VisualizationNode<T extends IVisualizationNodeData = IVisualizationNodeData> implements IVisualizationNode<T> {
  lastUpdate: number = 0;
  private parentNode: IVisualizationNode | undefined = undefined;
  private previousNode: IVisualizationNode | undefined = undefined;
  private nextNode: IVisualizationNode | undefined = undefined;
  private children: IVisualizationNode[] | undefined;
  private endNode: IVisualizationNode[] = [];
  private readonly DISABLED_NODE_INTERACTION: NodeInteraction = DISABLED_NODE_INTERACTION;

  constructor(
    public readonly id: string,
    public data: T,
  ) {
    makeObservable(this, {
      lastUpdate: observable,
      updateModel: action,
    });
    this.endNode = [this];
  }

  getId(): string | undefined {
    return this.getBaseEntity()?.getId();
  }

  getNodeLabel(labelType?: NodeLabelType): string {
    return this.getBaseEntity()?.getNodeLabel(this.data.path, labelType) ?? this.id;
  }

  getTooltipContent(): string {
    return this.getBaseEntity()?.getTooltipContent(this.data.path) ?? this.id;
  }

  getNodeTitle(): string {
    return this.getBaseEntity()?.getNodeTitle(this.data.path) ?? this.id;
  }

  addBaseEntityStep(definition: DefinedComponent, mode: AddStepMode): void {
    this.getBaseEntity()?.addStep({ definedComponent: definition, mode, data: this.data });
  }

  getCopiedContent(): IClipboardCopyObject | undefined {
    return this.getBaseEntity()?.getCopiedContent(this.data.path);
  }

  pasteBaseEntityStep(definition: IClipboardCopyObject, mode: AddStepMode): void {
    this.getBaseEntity()?.pasteStep({ clipboardContent: definition, mode, data: this.data });
  }

  canDragNode(): boolean {
    return this.getBaseEntity()?.canDragNode(this.data.path) ?? false;
  }

  canDropOnNode(): boolean {
    return this.getBaseEntity()?.canDropOnNode(this.data.path) ?? false;
  }

  moveNodeTo(path: string): void {
    this.getBaseEntity()?.moveNodeTo({ draggedNodePath: path, droppedNodePath: this.data.path });
  }

  getNodeInteraction(): NodeInteraction {
    return this.getBaseEntity()?.getNodeInteraction(this.data) ?? this.DISABLED_NODE_INTERACTION;
  }

  getComponentSchema(): VisualComponentSchema | undefined {
    return this.getBaseEntity()?.getComponentSchema(this.data.path);
  }

  getOmitFormFields(): string[] {
    return this.getBaseEntity()?.getOmitFormFields() ?? [];
  }

  updateModel(value: unknown): void {
    this.getBaseEntity()?.updateModel(this.data.path, value);
    this.lastUpdate = Date.now();
  }

  getParentNode(): IVisualizationNode | undefined {
    return this.parentNode;
  }

  setParentNode(parentNode?: IVisualizationNode) {
    this.parentNode = parentNode;
  }

  getPreviousNode(): IVisualizationNode | undefined {
    return this.previousNode;
  }

  getEndNodes(): IVisualizationNode[] {
    return this.endNode;
  }
  setEndNodes(node: IVisualizationNode[]) {
    this.endNode = node;
  }
  appendEndNodes(...node: IVisualizationNode[]) {
    this.endNode.push(...node);
  }
  setPreviousNode(previousNode?: IVisualizationNode) {
    this.previousNode = previousNode;
  }

  getNextNode(): IVisualizationNode | undefined {
    return this.nextNode;
  }

  setNextNode(node?: IVisualizationNode) {
    this.nextNode = node;
  }

  getChildren(): IVisualizationNode[] | undefined {
    return this.children;
  }

  addChild(child: IVisualizationNode): void {
    if (!Array.isArray(this.children)) this.children = [];

    this.children.push(child);
    child.setParentNode(this);
  }

  removeChild(): void {
    this.getBaseEntity()?.removeStep(this.data.path);
    const parentChildren = this.getParentNode()?.getChildren() ?? [];
    const index = parentChildren.findIndex((node) => node.id === this.id);

    if (index !== undefined && index > -1) {
      this.setParentNode(undefined);
      parentChildren.splice(index, 1);
    }
  }

  getNodeValidationText(): string | undefined {
    return this.getBaseEntity()?.getNodeValidationText(this.data.path);
  }

  /**
   * Get the underlying entity for the entire flow
   * This property is only set on the root node
   */
  protected getBaseEntity(): BaseVisualCamelEntity | undefined {
    return this.getRootNode().data.entity;
  }

  protected getRootNode(): IVisualizationNode {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let rootNode: IVisualizationNode | undefined = this;

    while (rootNode?.getPreviousNode() !== undefined || rootNode?.getParentNode() !== undefined) {
      rootNode = rootNode.getPreviousNode() ?? rootNode.getParentNode();
    }

    return rootNode!;
  }
}
