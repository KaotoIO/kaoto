import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { Edge, Node } from 'reactflow';

export class VisualizationNode<T = unknown> {
  readonly id: string;
  private parentNode: VisualizationNode | undefined = undefined;
  private previousNode: VisualizationNode | undefined = undefined;
  private nextNode: VisualizationNode | undefined = undefined;
  private children: VisualizationNode[] | undefined;

  constructor(
    public label: string,
    private data?: T,
  ) {
    this.id = getCamelRandomId(label);
  }

  getData(): T | undefined {
    return this.data;
  }

  getParentNode(): VisualizationNode | undefined {
    return this.parentNode;
  }

  setParentNode(parentNode: VisualizationNode) {
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
      this.children?.splice(index, 1);
    }
  }

  toNode(): Node {
    /** Check if it's the first node */
    const type = this.parentNode === undefined && this.previousNode === undefined ? 'input' : 'default';

    /** Join the parent if exist to form a group */
    const parentNode = this.parentNode?.children !== undefined ? this.parentNode.toNode().id : undefined;

    return {
      id: this.id,
      type,
      parentNode,
      data: { label: this.label },
      position: { x: 0, y: 0 },
      style: { borderRadius: '20px', padding: '10px', width: 150, height: 40 },
    };
  }

  getEdges(): Edge[] {
    const edges: Edge[] = [];

    /** Connect to previous node if it doesn't have children */
    if (this.previousNode !== undefined && this.previousNode.children === undefined) {
      edges.push({
        id: `${this.previousNode.id}-to-${this.id}`,
        source: this.previousNode.id,
        target: this.id,
        type: 'smoothstep',
        animated: true,
      });
    }

    /** Connect to the parent if there is no previous node */
    if (this.parentNode !== undefined && this.previousNode === undefined) {
      edges.push({
        id: `${this.parentNode.id}-to-${this.id}`,
        source: this.parentNode.id,
        target: this.id,
        type: 'smoothstep',
        animated: true,
      });
    }

    /** Connect to each leaf of the previous node */
    if (this.previousNode !== undefined && this.previousNode.children !== undefined) {
      const leafNodesIds: string[] = [];
      this.previousNode.populateLeafNodesIds(leafNodesIds);

      leafNodesIds.forEach((leafNodeId) => {
        edges.push({
          id: `${leafNodeId}-to-${this.id}`,
          source: leafNodeId,
          target: this.id,
          type: 'smoothstep',
          animated: true,
        });
      });
    }

    return edges;
  }

  private populateLeafNodesIds(ids: string[]): void {
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
