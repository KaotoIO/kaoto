import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { BaseVisualCamelEntity, IVisualizationNode, VisualComponentSchema } from './base-visual-entity';

export const createVisualizationNode: (
  ...args: ConstructorParameters<typeof VisualizationNode>
) => IVisualizationNode = (...args): IVisualizationNode => new VisualizationNode(...args);

/**
 * VisualizationNode
 * This class is used to represent a node in the visualization tree.
 * It shouldn't be used directly, but rather through the IVisualizationNode interface.
 */
class VisualizationNode implements IVisualizationNode {
  readonly id: string;
  private parentNode: IVisualizationNode | undefined = undefined;
  private previousNode: IVisualizationNode | undefined = undefined;
  private nextNode: IVisualizationNode | undefined = undefined;
  private children: IVisualizationNode[] | undefined;
  path: string | undefined;
  iconData: string | undefined;

  constructor(
    public label: string,
    private entity?: BaseVisualCamelEntity,
  ) {
    this.id = getCamelRandomId(label);
  }

  getBaseEntity(): BaseVisualCamelEntity | undefined {
    return this.entity;
  }

  getComponentSchema(): VisualComponentSchema | undefined {
    return this.getRootNode().getBaseEntity()?.getComponentSchema(this.path);
  }

  updateModel(value: unknown): void {
    this.getRootNode().getBaseEntity()?.updateModel(this.path, value);
  }

  getRootNode(): IVisualizationNode {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let rootNode: IVisualizationNode | undefined = this;

    while (rootNode?.getPreviousNode() !== undefined || rootNode?.getParentNode() !== undefined) {
      rootNode = rootNode.getPreviousNode() ?? rootNode.getParentNode();
    }

    return rootNode!;
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

  setChildren(children: IVisualizationNode[]): void {
    this.children = children;
  }

  addChild(child: IVisualizationNode): void {
    if (!Array.isArray(this.children)) this.children = [];

    this.children.push(child);
    child.setParentNode(this);
  }

  removeChild(child: IVisualizationNode): void {
    this.getRootNode().getBaseEntity()?.removeStep(this.path);
    const index = this.children?.findIndex((node) => node.id === child.id);

    if (index !== undefined && index > -1) {
      this.children?.[index].setParentNode(undefined);
      this.children?.splice(index, 1);
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
}
