import { camelRouteJson } from '../../stubs/camel-route';
import { BaseVisualCamelEntity, IVisualizationNode } from './base-visual-entity';
import { CamelRouteVisualEntity } from './flows';
import { createVisualizationNode } from './visualization-node';

describe('VisualizationNode', () => {
  let node: IVisualizationNode;

  beforeEach(() => {
    node = createVisualizationNode({ label: 'test' });
  });

  it('should create a node with a random id', () => {
    expect(node.id).toEqual('test-1234');
  });

  it('should return the base visual entity', () => {
    const visualEntity = {} as BaseVisualCamelEntity;
    node = createVisualizationNode({ label: 'test', entity: visualEntity });

    expect(node.getBaseEntity()).toEqual(visualEntity);
  });

  it('should return the component schema from the underlying BaseVsualCamelEntity', () => {
    const getComponentSchemaSpy = jest.fn();
    const visualEntity = {
      getComponentSchema: getComponentSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    node = createVisualizationNode({ label: 'test', path: 'test-path', entity: visualEntity });
    node.getComponentSchema();

    expect(getComponentSchemaSpy).toHaveBeenCalledWith(node.data.path);
  });

  it('should return the component schema from the root node', () => {
    /** Arrange */
    const getComponentSchemaSpy = jest.fn();
    const visualEntity = {
      getComponentSchema: getComponentSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    const rootNode = createVisualizationNode({ label: 'test', path: 'test-path', entity: visualEntity });
    node.setParentNode(rootNode);

    /** Act */
    node.getComponentSchema();

    /** Assert */
    expect(getComponentSchemaSpy).toHaveBeenCalledWith(node.data.path);
  });

  describe('updateModel', () => {
    it('should update the model on the underlying BaseVisualCamelEntity', () => {
      const updateModelSpy = jest.fn();
      const visualEntity = {
        updateModel: updateModelSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode({ label: 'test', path: 'test-path', entity: visualEntity });
      node.updateModel('test-value');

      expect(updateModelSpy).toHaveBeenCalledWith(node.data.path, 'test-value');
    });

    it('should update the model on the root node', () => {
      /** Arrange */
      const updateModelSpy = jest.fn();
      const visualEntity = {
        updateModel: updateModelSpy,
      } as unknown as BaseVisualCamelEntity;

      const rootNode = createVisualizationNode({ label: 'test', entity: visualEntity });
      node.setParentNode(rootNode);

      /** Act */
      node.updateModel('test-value');

      /** Assert */
      expect(updateModelSpy).toHaveBeenCalledWith(node.data.path, 'test-value');
    });
  });

  it('should set the parent node', () => {
    const parentNode = createVisualizationNode({ label: 'parent' });
    node.setParentNode(parentNode);

    expect(node.getParentNode()).toEqual(parentNode);
  });

  it('should set the previous node', () => {
    const previousNode = createVisualizationNode({ label: 'previous' });
    node.setPreviousNode(previousNode);

    expect(node.getPreviousNode()).toEqual(previousNode);
  });

  it('should set the next node', () => {
    const nextNode = createVisualizationNode({ label: 'next' });
    node.setNextNode(nextNode);

    expect(node.getNextNode()).toEqual(nextNode);
  });

  it('should set the children', () => {
    const children = [createVisualizationNode({ label: 'child' })];
    node.setChildren(children);

    expect(node.getChildren()).toEqual(children);
  });

  it('should add a child', () => {
    const child = createVisualizationNode({ label: 'child' });
    node.addChild(child);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toEqual(node);
  });

  it('should add a child to an existing children array', () => {
    const child = createVisualizationNode({ label: 'child' });
    node.setChildren([child]);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toBeUndefined();
  });

  describe('removeChild', () => {
    it('should remove a child', () => {
      const child = createVisualizationNode({ label: 'child' });
      node.addChild(child);
      node.removeChild(child);

      expect(node.getChildren()).toEqual([]);
      expect(child.getParentNode()).toBeUndefined();
    });

    it('should remove a child from an existing children array', () => {
      const child = createVisualizationNode({ label: 'child' });
      node.setChildren([child]);
      node.removeChild(child);

      expect(node.getChildren()).toEqual([]);
      expect(child.getParentNode()).toBeUndefined();
    });

    it('should not error when removing a non-existing child', () => {
      const child = createVisualizationNode({ label: 'child' });
      node.removeChild(child);

      expect(node.getChildren()).toBeUndefined();
      expect(child.getParentNode()).toBeUndefined();
    });

    it('should delegate to the BaseVisualCamelEntity to remove the underlying child', () => {
      const camelRouteVisualEntityStub = new CamelRouteVisualEntity(camelRouteJson.route);

      node = camelRouteVisualEntityStub.toVizNode();

      /** Remove set-header node */
      node.getNextNode()?.removeChild(node.getNextNode()!);

      /** Refresh the Viz Node */
      node = camelRouteVisualEntityStub.toVizNode();

      expect(node.getNextNode()?.data.label).toEqual('choice');
    });
  });

  it('should populate the leaf nodes ids - simple relationship', () => {
    const child = createVisualizationNode({ label: 'child' });
    node.addChild(child);

    const leafNode = createVisualizationNode({ label: 'leaf' });
    child.addChild(leafNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['leaf-1234']);
  });

  it('should populate the leaf nodes ids - complex relationship', () => {
    const choiceNode = createVisualizationNode({ label: 'choice' });
    node.addChild(choiceNode);

    const whenNode = createVisualizationNode({ label: 'when' });
    choiceNode.addChild(whenNode);

    const otherwiseNode = createVisualizationNode({ label: 'otherwise' });
    choiceNode.addChild(otherwiseNode);

    const whenLeafNode = createVisualizationNode({ label: 'when-leaf' });
    whenNode.addChild(whenLeafNode);

    const processNode = createVisualizationNode({ label: 'process' });
    otherwiseNode.addChild(processNode);
    const logNode = createVisualizationNode({ label: 'log' });
    processNode.addChild(logNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['when-leaf-1234', 'log-1234']);
  });
});
