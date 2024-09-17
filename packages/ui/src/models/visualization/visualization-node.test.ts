import { camelRouteJson } from '../../stubs/camel-route';
import { NodeLabelType } from '../settings';
import { BaseVisualCamelEntity, DISABLED_NODE_INTERACTION, IVisualizationNode } from './base-visual-entity';
import { CamelRouteVisualEntity } from './flows';
import { createVisualizationNode } from './visualization-node';
import { NodeInteraction } from './base-visual-entity';

describe('VisualizationNode', () => {
  let node: IVisualizationNode;

  beforeEach(() => {
    node = createVisualizationNode('test', {});
  });

  it('should create a node with a random id', () => {
    expect(node.id).toEqual('test-1234');
  });

  it('should return the base entity ID', () => {
    const visualEntity = new CamelRouteVisualEntity(camelRouteJson);
    node = createVisualizationNode('test', { entity: visualEntity });

    expect(node.getId()).toEqual('route-8888');
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

  it('should delegate getOmitFormFields() to the underlying BaseVisualCamelEntity', () => {
    const getOmitFormFieldsSpy = jest.fn();
    const visualEntity = {
      getOmitFormFields: getOmitFormFieldsSpy,
    } as unknown as BaseVisualCamelEntity;

    node = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
    node.getOmitFormFields();

    expect(getOmitFormFieldsSpy).toHaveBeenCalled();
  });

  describe('getNodeLabel', () => {
    it('should return the label from the underlying BaseVisualCamelEntity', () => {
      const getNodeLabelSpy = jest.fn().mockReturnValue('test-label');
      const visualEntity = {
        getNodeLabel: getNodeLabelSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
      const label = node.getNodeLabel(NodeLabelType.Id);

      expect(getNodeLabelSpy).toHaveBeenCalledWith(node.data.path, NodeLabelType.Id);
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

  describe('getNodeInteraction', () => {
    it('should return the added nodeInteraction', () => {
      const testNodeInteraction: NodeInteraction = {
        canHavePreviousStep: true,
        canHaveNextStep: true,
        canHaveChildren: true,
        canHaveSpecialChildren: true,
        canReplaceStep: false,
        canRemoveStep: false,
        canRemoveFlow: false,
        canBeDisabled: true,
      };
      node.setNodeInteraction(testNodeInteraction);

      expect(node.getNodeInteraction()).toEqual(testNodeInteraction);
    });

    it('should return node interaction from the underlying base entity', () => {
      const mockNodeInteraction: NodeInteraction = {
        canHavePreviousStep: true,
        canHaveNextStep: true,
        canHaveChildren: true,
        canHaveSpecialChildren: true,
        canReplaceStep: false,
        canRemoveStep: true,
        canRemoveFlow: false,
        canBeDisabled: true,
      };
      const getNodeInteractionSpy = jest.fn().mockReturnValue(mockNodeInteraction);
      const visualEntity = {
        getNodeInteraction: getNodeInteractionSpy,
      } as unknown as BaseVisualCamelEntity;
      node = createVisualizationNode('test', { entity: visualEntity });
      const expectedNodeInteraction = node.getNodeInteraction();

      expect(getNodeInteractionSpy).toHaveBeenCalledWith(node.data);
      expect(expectedNodeInteraction).toEqual(mockNodeInteraction);
    });

    it('should return DISABLED_NODE_INTERACTION when there is no underlying base entity', () => {
      node = createVisualizationNode('test', {});
      expect(node.getNodeInteraction()).toEqual(DISABLED_NODE_INTERACTION);
    });
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
      const camelRouteVisualEntityStub = new CamelRouteVisualEntity(camelRouteJson);

      node = camelRouteVisualEntityStub.toVizNode();
      const fromNode = node.getChildren()?.[0];

      /** Get set-header node */
      const setHeaderNode = node.getChildren()?.[1];

      /** Remove set-header node */
      setHeaderNode!.removeChild();

      /** Refresh the Viz Node */
      node = camelRouteVisualEntityStub.toVizNode();

      expect(node.getChildren()?.[0].getNodeLabel()).toEqual('timer');
      expect(node.getChildren()?.[1].getNodeLabel()).toEqual('choice');
      expect(node.getChildren()?.[2].getNodeLabel()).toEqual('direct');
      expect(node.getChildren()).toHaveLength(3);
      expect(fromNode!.getChildren()).toHaveLength(0);
    });
  });

  describe('getNodeValidationText', () => {
    it('should return undefined when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', {});
      const validationText = node.getNodeValidationText();

      expect(validationText).toBeUndefined();
    });

    it('should return the validation text from the underlying BaseVisualCamelEntity', () => {
      const getNodeValidationTextSpy = jest.fn().mockReturnValue('test-validation-text');
      const visualEntity = {
        getNodeValidationText: getNodeValidationTextSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', { path: 'test-path', entity: visualEntity });
      const validationText = node.getNodeValidationText();

      expect(getNodeValidationTextSpy).toHaveBeenCalledWith(node.data.path);
      expect(validationText).toEqual('test-validation-text');
    });
  });
});
