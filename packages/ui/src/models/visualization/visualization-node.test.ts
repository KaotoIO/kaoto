import { VisualizationNode } from './visualization-node';

describe('VisualizationNode', () => {
  let node: VisualizationNode;

  beforeAll(() => {
    jest
      .spyOn(global, 'crypto', 'get')
      .mockImplementation(() => ({ getRandomValues: () => [12345678] }) as unknown as Crypto);
  });

  beforeEach(() => {
    node = new VisualizationNode('test');
  });

  it('should create a node with a random id', () => {
    expect(node.id).toEqual('test-1234');
  });

  it('should return the data', () => {
    node = new VisualizationNode('test', 'data');

    expect(node.getData()).toEqual('data');
  });

  it('should set the parent node', () => {
    const parentNode = new VisualizationNode('parent');
    node.setParentNode(parentNode);

    expect(node.getParentNode()).toEqual(parentNode);
  });

  it('should set the previous node', () => {
    const previousNode = new VisualizationNode('previous');
    node.setPreviousNode(previousNode);

    expect(node.getPreviousNode()).toEqual(previousNode);
  });

  it('should set the next node', () => {
    const nextNode = new VisualizationNode('next');
    node.setNextNode(nextNode);

    expect(node.getNextNode()).toEqual(nextNode);
  });

  it('should set the children', () => {
    const children = [new VisualizationNode('child')];
    node.setChildren(children);

    expect(node.getChildren()).toEqual(children);
  });

  it('should add a child', () => {
    const child = new VisualizationNode('child');
    node.addChild(child);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toEqual(node);
  });

  it('should add a child to an existing children array', () => {
    const child = new VisualizationNode('child');
    node.setChildren([child]);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should return the node as a transformed node', () => {
    const previousNode = new VisualizationNode('previous');
    node.setPreviousNode(previousNode);

    const transformedNode = node.toNode();
    expect(transformedNode).toEqual({
      id: 'test-1234',
      type: 'default',
      parentNode: undefined,
      data: {
        label: 'test',
      },
      position: { x: 0, y: 0 },
      style: { borderRadius: '20px', padding: '10px', width: 150, height: 40 },
    });
  });

  it('should add this node to its parent if exists', () => {
    const parentNode = new VisualizationNode('parent');
    node.setParentNode(parentNode);
    parentNode.addChild(node);

    const transformedNode = node.toNode();
    expect(transformedNode).toEqual({
      id: 'test-1234',
      type: 'default',
      parentNode: 'parent-1234',
      data: {
        label: 'test',
      },
      position: { x: 0, y: 0 },
      style: { borderRadius: '20px', padding: '10px', width: 150, height: 40 },
    });
  });

  it('should mark this node as first node if it does not have a parent neither a previous step', () => {
    const transformedNode = node.toNode();
    expect(transformedNode).toEqual({
      id: 'test-1234',
      type: 'input',
      parentNode: undefined,
      data: {
        label: 'test',
      },
      position: { x: 0, y: 0 },
      style: { borderRadius: '20px', padding: '10px', width: 150, height: 40 },
    });
  });
});
