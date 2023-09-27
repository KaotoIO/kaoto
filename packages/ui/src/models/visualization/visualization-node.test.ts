import { BaseVisualCamelEntity } from './base-visual-entity';
import { VisualizationNode } from './visualization-node';

describe('VisualizationNode', () => {
  let node: VisualizationNode;

  beforeEach(() => {
    node = new VisualizationNode('test');
  });

  it('should create a node with a random id', () => {
    expect(node.id).toEqual('test-1234');
  });

  it('should return the base visual entity', () => {
    const visualEntity = {} as BaseVisualCamelEntity;
    node = new VisualizationNode('test', visualEntity);

    expect(node.getBaseEntity()).toEqual(visualEntity);
  });

  it('should return the component schema from the underlying BaseVsualCamelEntity', () => {
    const getComponentSchemaSpy = jest.fn();
    const visualEntity = {
      getComponentSchema: getComponentSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    node = new VisualizationNode('test', visualEntity);
    node.path = 'test-path';
    node.getComponentSchema();

    expect(getComponentSchemaSpy).toHaveBeenCalledWith(node.path);
  });

  it('should return the component schema from the root node', () => {
    /** Arrange */
    const getComponentSchemaSpy = jest.fn();
    const visualEntity = {
      getComponentSchema: getComponentSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    const rootNode = new VisualizationNode('test', visualEntity);
    rootNode.path = 'test-path';
    node.setParentNode(rootNode);

    /** Act */
    node.getComponentSchema();

    /** Assert */
    expect(getComponentSchemaSpy).toHaveBeenCalledWith(node.path);
  });

  describe('updateModel', () => {
    it('should update the model on the underlying BaseVisualCamelEntity', () => {
      const updateModelSpy = jest.fn();
      const visualEntity = {
        updateModel: updateModelSpy,
      } as unknown as BaseVisualCamelEntity;

      node = new VisualizationNode('test', visualEntity);
      node.path = 'test-path';
      node.updateModel('test-value');

      expect(updateModelSpy).toHaveBeenCalledWith(node.path, 'test-value');
    });

    it('should update the model on the root node', () => {
      /** Arrange */
      const updateModelSpy = jest.fn();
      const visualEntity = {
        updateModel: updateModelSpy,
      } as unknown as BaseVisualCamelEntity;

      const rootNode = new VisualizationNode('test', visualEntity);
      rootNode.path = 'test-path';
      node.setParentNode(rootNode);

      /** Act */
      node.updateModel('test-value');

      /** Assert */
      expect(updateModelSpy).toHaveBeenCalledWith(node.path, 'test-value');
    });
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

  it('should remove a child', () => {
    const child = new VisualizationNode('child');
    node.addChild(child);
    node.removeChild(child);

    expect(node.getChildren()).toEqual([]);
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should remove a child from an existing children array', () => {
    const child = new VisualizationNode('child');
    node.setChildren([child]);
    node.removeChild(child);

    expect(node.getChildren()).toEqual([]);
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should not error when removing a non-existing child', () => {
    const child = new VisualizationNode('child');
    node.removeChild(child);

    expect(node.getChildren()).toBeUndefined();
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should populate the leaf nodes ids - simple relationship', () => {
    const child = new VisualizationNode('child');
    node.addChild(child);

    const leafNode = new VisualizationNode('leaf');
    child.addChild(leafNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['leaf-1234']);
  });

  it('should populate the leaf nodes ids - complex relationship', () => {
    const choiceNode = new VisualizationNode('choice');
    node.addChild(choiceNode);

    const whenNode = new VisualizationNode('when');
    choiceNode.addChild(whenNode);

    const otherwiseNode = new VisualizationNode('otherwise');
    choiceNode.addChild(otherwiseNode);

    const whenLeafNode = new VisualizationNode('when-leaf');
    whenNode.addChild(whenLeafNode);

    const processNode = new VisualizationNode('process');
    otherwiseNode.addChild(processNode);
    const logNode = new VisualizationNode('log');
    processNode.addChild(logNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['when-leaf-1234', 'log-1234']);
  });
});
