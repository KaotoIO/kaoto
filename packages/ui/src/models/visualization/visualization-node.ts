import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { DefinedComponent } from '../camel-catalog-index';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from './base-visual-entity';

export const createVisualizationNode = <T extends IVisualizationNodeData = IVisualizationNodeData>(
  id: string,
  data: T,
): IVisualizationNode<T> => new VisualizationNode(getCamelRandomId(id), data);

/**
 * VisualizationNode
 * This class is used to represent a node in the visualization tree.
 * It shouldn't be used directly, but rather through the IVisualizationNode interface.
 */
class VisualizationNode<T extends IVisualizationNodeData = IVisualizationNodeData> implements IVisualizationNode<T> {
  private parentNode: IVisualizationNode | undefined = undefined;
  private previousNode: IVisualizationNode | undefined = undefined;
  private nextNode: IVisualizationNode | undefined = undefined;
  private children: IVisualizationNode[] | undefined;
  private readonly DISABLED_NODE_INTERACTION: NodeInteraction = {
    canHavePreviousStep: false,
    canHaveNextStep: false,
    canHaveChildren: false,
    canHaveSpecialChildren: false,
    canReplaceStep: false,
    canRemoveStep: false,
    canRemoveFlow: false,
    canBeDisabled: false,
  };

  constructor(
    public readonly id: string,
    public data: T,
  ) {}

  getBaseEntity(): BaseVisualCamelEntity | undefined {
    return this.getRootNode().data.entity;
  }

  getNodeLabel(labelType?: string): string {
    return this.getBaseEntity()?.getNodeLabel(this.data.path, labelType) ?? this.id;
  }

  getTooltipContent(): string {
    return this.getBaseEntity()?.getTooltipContent(this.data.path) ?? this.id;
  }

  addBaseEntityStep(definition: DefinedComponent, mode: AddStepMode): void {
    this.getBaseEntity()?.addStep({ definedComponent: definition, mode, data: this.data });
  }

  getNodeInteraction(): NodeInteraction {
    return this.getBaseEntity()?.getNodeInteraction(this.data) ?? this.DISABLED_NODE_INTERACTION;
  }

  getComponentSchema(): VisualComponentSchema | undefined {
    return this.getBaseEntity()?.getComponentSchema(this.data.path);
  }

  updateModel(value: unknown): void {
    this.getBaseEntity()?.updateModel(this.data.path, value);
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

  setPreviousNode(previousNode: IVisualizationNode) {
    this.previousNode = previousNode;
  }

  getNextNode(): IVisualizationNode | undefined {
    return this.nextNode;
  }

  setNextNode(node: IVisualizationNode) {
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

  populateLeafNodesIds(ids: string[]): void {
    /** If this node doesn't have a next node neither children, it can be considered a leaf node */
    if (this.nextNode === undefined && this.children === undefined) {
      ids.push(this.id);
      return;
    }

    /** If this node has children, populate the leaf nodes ids of each child */
    this.children?.forEach((child) => child.populateLeafNodesIds(ids));
  }

  getNodeValidationText(): string | undefined {
    return this.getBaseEntity()?.getNodeValidationText(this.data.path);
  }

  private getRootNode(): IVisualizationNode {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let rootNode: IVisualizationNode | undefined = this;

    while (rootNode?.getPreviousNode() !== undefined || rootNode?.getParentNode() !== undefined) {
      rootNode = rootNode.getPreviousNode() ?? rootNode.getParentNode();
    }

    return rootNode!;
  }
}
