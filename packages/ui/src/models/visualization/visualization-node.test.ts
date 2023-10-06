import { BaseVisualCamelEntity, IVisualizationNode } from './base-visual-entity';
import { createVisualizationNode } from './visualization-node';

describe('VisualizationNode', () => {
  let node: IVisualizationNode;

  beforeEach(() => {
    node = createVisualizationNode('test');
  });

  it('should create a node with a random id', () => {
    expect(node.id).toEqual('test-1234');
  });

  it('should return the base visual entity', () => {
    const visualEntity = {} as BaseVisualCamelEntity;
    node = createVisualizationNode('test', visualEntity);

    expect(node.getBaseEntity()).toEqual(visualEntity);
  });

  it('should return the component schema from the underlying BaseVsualCamelEntity', () => {
    const getComponentSchemaSpy = jest.fn();
    const visualEntity = {
      getComponentSchema: getComponentSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    node = createVisualizationNode('test', visualEntity);
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

    const rootNode = createVisualizationNode('test', visualEntity);
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

      node = createVisualizationNode('test', visualEntity);
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

      const rootNode = createVisualizationNode('test', visualEntity);
      rootNode.path = 'test-path';
      node.setParentNode(rootNode);

      /** Act */
      node.updateModel('test-value');

      /** Assert */
      expect(updateModelSpy).toHaveBeenCalledWith(node.path, 'test-value');
    });
  });

  it('should set the parent node', () => {
    const parentNode = createVisualizationNode('parent');
    node.setParentNode(parentNode);

    expect(node.getParentNode()).toEqual(parentNode);
  });

  it('should set the previous node', () => {
    const previousNode = createVisualizationNode('previous');
    node.setPreviousNode(previousNode);

    expect(node.getPreviousNode()).toEqual(previousNode);
  });

  it('should set the next node', () => {
    const nextNode = createVisualizationNode('next');
    node.setNextNode(nextNode);

    expect(node.getNextNode()).toEqual(nextNode);
  });

  it('should set the children', () => {
    const children = [createVisualizationNode('child')];
    node.setChildren(children);

    expect(node.getChildren()).toEqual(children);
  });

  it('should add a child', () => {
    const child = createVisualizationNode('child');
    node.addChild(child);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toEqual(node);
  });

  it('should add a child to an existing children array', () => {
    const child = createVisualizationNode('child');
    node.setChildren([child]);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should remove a child', () => {
    const child = createVisualizationNode('child');
    node.addChild(child);
    node.removeChild(child);

    expect(node.getChildren()).toEqual([]);
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should remove a child from an existing children array', () => {
    const child = createVisualizationNode('child');
    node.setChildren([child]);
    node.removeChild(child);

    expect(node.getChildren()).toEqual([]);
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should not error when removing a non-existing child', () => {
    const child = createVisualizationNode('child');
    node.removeChild(child);

    expect(node.getChildren()).toBeUndefined();
    expect(child.getParentNode()).toBeUndefined();
  });

  it('should populate the leaf nodes ids - simple relationship', () => {
    const child = createVisualizationNode('child');
    node.addChild(child);

    const leafNode = createVisualizationNode('leaf');
    child.addChild(leafNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['leaf-1234']);
  });

  it('should populate the leaf nodes ids - complex relationship', () => {
    const choiceNode = createVisualizationNode('choice');
    node.addChild(choiceNode);

    const whenNode = createVisualizationNode('when');
    choiceNode.addChild(whenNode);

    const otherwiseNode = createVisualizationNode('otherwise');
    choiceNode.addChild(otherwiseNode);

    const whenLeafNode = createVisualizationNode('when-leaf');
    whenNode.addChild(whenLeafNode);

    const processNode = createVisualizationNode('process');
    otherwiseNode.addChild(processNode);
    const logNode = createVisualizationNode('log');
    processNode.addChild(logNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['when-leaf-1234', 'log-1234']);
  });
});
