import { getCamelRandomId } from '../../camel-utils/camel-random-id';

export class VisualizationNode<T = unknown> {
  readonly id: string;
  private parentNode: VisualizationNode | undefined = undefined;
  private previousNode: VisualizationNode | undefined = undefined;
  private nextNode: VisualizationNode | undefined = undefined;
  private children: VisualizationNode[] | undefined;
  path: string | undefined;

  constructor(
    public label: string,
    private data?: T,
  ) {
    this.id = getCamelRandomId(label);
  }

  getData(): T | undefined {
    return this.data;
  }

  getRootNode(): VisualizationNode {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let rootNode = this;

    while (rootNode.getPreviousNode() !== undefined || rootNode.getParentNode() !== undefined) {
      rootNode = rootNode.getPreviousNode() ?? rootNode.getParentNode();
    }

    return rootNode;
  }

  getParentNode(): VisualizationNode | undefined {
    return this.parentNode;
  }

  setParentNode(parentNode?: VisualizationNode) {
    this.parentNode = parentNode;
  }

  getPreviousNode(): VisualizationNode | undefined {
    return this.previousNode;
  }

  setPreviousNode(previousNode: VisualizationNode) {
    this.previousNode = previousNode;
  }

  getNextNode(): VisualizationNode | undefined {
    return this.nextNode;
  }

  setNextNode(node: VisualizationNode) {
    this.nextNode = node;
  }

  getChildren(): VisualizationNode[] | undefined {
    return this.children;
  }

  setChildren(children: VisualizationNode[]): void {
    this.children = children;
  }

  addChild(child: VisualizationNode): void {
    if (!Array.isArray(this.children)) this.children = [];

    this.children.push(child);
    child.setParentNode(this);
  }

  removeChild(child: VisualizationNode): void {
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
    if (this.children !== undefined) {
      this.children.forEach((child) => child.populateLeafNodesIds(ids));
    }
  }
}
