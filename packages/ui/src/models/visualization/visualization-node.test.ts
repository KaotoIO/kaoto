import { camelRouteJson } from '../../stubs/camel-route';
import { BaseVisualCamelEntity, IVisualizationNode } from './base-visual-entity';
import { CamelRouteVisualEntity } from './flows';
import { createVisualizationNode } from './visualization-node';

describe('VisualizationNode', () => {
  let node: IVisualizationNode;

  beforeEach(() => {
    node = createVisualizationNode('test', {});
  });

  it('should create a node with a random id', () => {
    expect(node.id).toEqual('test-1234');
  });

  it('should return the base visual entity', () => {
    const visualEntity = {} as BaseVisualCamelEntity;
    node = createVisualizationNode('test', { entity: visualEntity });

    expect(node.getBaseEntity()).toEqual(visualEntity);
  });

  it('should return the component schema from the underlying BaseVisualCamelEntity', () => {
    const getComponentSchemaSpy = jest.fn();
    const visualEntity = {
      getComponentSchema: getComponentSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    node = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
    node.getComponentSchema();

    expect(getComponentSchemaSpy).toHaveBeenCalledWith(node.data.path);
  });

  describe('getNodeLabel', () => {
    it('should return the label from the underlying BaseVisualCamelEntity', () => {
      const getNodeLabelSpy = jest.fn().mockReturnValue('test-label');
      const visualEntity = {
        getNodeLabel: getNodeLabelSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
      const label = node.getNodeLabel();

      expect(getNodeLabelSpy).toHaveBeenCalledWith(node.data.path);
      expect(label).toEqual('test-label');
    });

    it('should return the id when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', {});
      const label = node.getNodeLabel();

      expect(label).toEqual(node.id);
    });
  });

  describe('getTooltipContent', () => {
    it('should return the tootltip content from the underlying BaseVisualCamelEntity', () => {
      const getTooltipContentSpy = jest.fn().mockReturnValue('test-description');
      const visualEntity = {
        getTooltipContent: getTooltipContentSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
      const content = node.getTooltipContent();

      expect(getTooltipContentSpy).toHaveBeenCalledWith(node.data.path);
      expect(content).toEqual('test-description');
    });

    it('should return the id when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', {});
      const content = node.getTooltipContent();

      expect(content).toEqual(node.id);
    });
  });

  it('should return the component schema from the root node', () => {
    /** Arrange */
    const getComponentSchemaSpy = jest.fn();
    const visualEntity = {
      getComponentSchema: getComponentSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    const rootNode = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
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

      node = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
      node.updateModel('test-value');

      expect(updateModelSpy).toHaveBeenCalledWith(node.data.path, 'test-value');
    });

    it('should update the model on the root node', () => {
      /** Arrange */
      const updateModelSpy = jest.fn();
      const visualEntity = {
        updateModel: updateModelSpy,
      } as unknown as BaseVisualCamelEntity;

      const rootNode = createVisualizationNode('test', { entity: visualEntity });
      node.setParentNode(rootNode);

      /** Act */
      node.updateModel('test-value');

      /** Assert */
      expect(updateModelSpy).toHaveBeenCalledWith(node.data.path, 'test-value');
    });
  });

  it('should set the parent node', () => {
    const parentNode = createVisualizationNode('parent', {});
    node.setParentNode(parentNode);

    expect(node.getParentNode()).toEqual(parentNode);
  });

  it('should set the previous node', () => {
    const previousNode = createVisualizationNode('previous', {});
    node.setPreviousNode(previousNode);

    expect(node.getPreviousNode()).toEqual(previousNode);
  });

  it('should set the next node', () => {
    const nextNode = createVisualizationNode('next', {});
    node.setNextNode(nextNode);

    expect(node.getNextNode()).toEqual(nextNode);
  });

  it('should add a child', () => {
    const child = createVisualizationNode('child', {});
    node.addChild(child);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toEqual(node);
  });

  describe('removeChild', () => {
    it('should remove a child', () => {
      const child = createVisualizationNode('child', {});
      node.addChild(child);
      child.removeChild();

      expect(node.getChildren()).toEqual([]);
      expect(child.getParentNode()).toBeUndefined();
    });

    it('should not error when removing a non-existing child', () => {
      const child = createVisualizationNode('child', {});
      child.removeChild();

      expect(node.getChildren()).toBeUndefined();
      expect(child.getParentNode()).toBeUndefined();
    });

    it('should delegate to the BaseVisualCamelEntity to remove the underlying child', () => {
      const camelRouteVisualEntityStub = new CamelRouteVisualEntity(camelRouteJson.route);

      node = camelRouteVisualEntityStub.toVizNode();

      /** Get set-header node */
      const setHeaderNode = node.getChildren()?.[0];

      /** Remove set-header node */
      setHeaderNode!.removeChild();

      /** Refresh the Viz Node */
      node = camelRouteVisualEntityStub.toVizNode();

      expect(node.getChildren()?.[0].getNodeLabel()).toEqual('choice');
    });
  });

  it('should populate the leaf nodes ids - simple relationship', () => {
    const child = createVisualizationNode('child', {});
    node.addChild(child);

    const leafNode = createVisualizationNode('leaf', {});
    child.addChild(leafNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['leaf-1234']);
  });

  it('should populate the leaf nodes ids - complex relationship', () => {
    const choiceNode = createVisualizationNode('choice', {});
    node.addChild(choiceNode);

    const whenNode = createVisualizationNode('when', {});
    choiceNode.addChild(whenNode);

    const otherwiseNode = createVisualizationNode('otherwise', {});
    choiceNode.addChild(otherwiseNode);

    const whenLeafNode = createVisualizationNode('when-leaf', {});
    whenNode.addChild(whenLeafNode);

    const processNode = createVisualizationNode('process', {});
    otherwiseNode.addChild(processNode);
    const logNode = createVisualizationNode('log', {});
    processNode.addChild(logNode);

    const ids: string[] = [];
    node.populateLeafNodesIds(ids);

    expect(ids).toEqual(['when-leaf-1234', 'log-1234']);
  });
});
