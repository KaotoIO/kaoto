import { cloneDeep } from 'lodash';

import { camelRouteJson } from '../../stubs/camel-route';
import { SourceSchemaType } from '../camel';
import { CatalogKind } from '../catalog-kind';
import { NodeLabelType } from '../settings';
import { IClipboardCopyObject } from '../visualization/clipboard';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  DISABLED_NODE_INTERACTION,
  IVisualizationNode,
  NodeInteraction,
} from './base-visual-entity';
import { CamelRouteVisualEntity } from './flows';
import { createVisualizationNode } from './visualization-node';

describe('VisualizationNode', () => {
  let node: IVisualizationNode;

  beforeEach(() => {
    node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });
  });

  it('should create a node with the given id', () => {
    expect(node.id).toEqual('test');
  });

  describe('getNodeTitle', () => {
    it('should delegate to the base entity to get the title', () => {
      const visualEntity = new CamelRouteVisualEntity(camelRouteJson);
      const getNodeTitleSpy = jest.spyOn(visualEntity, 'getNodeTitle');

      node = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'route.from.steps.2.to',
        entity: visualEntity,
      });

      expect(node.getNodeTitle()).toEqual('direct');
      expect(getNodeTitleSpy).toHaveBeenCalledWith('route.from.steps.2.to');
    });

    it('should return the ID as title if there is no base entity', () => {
      expect(node.getNodeTitle()).toEqual('test');
    });
  });

  it('should return the base entity ID', () => {
    const visualEntity = new CamelRouteVisualEntity(camelRouteJson);
    node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log', entity: visualEntity });

    expect(node.getId()).toEqual('route-8888');
  });

  it('should return the node schema from the underlying BaseVisualCamelEntity', () => {
    const getNodeSchemaSpy = jest.fn();
    const visualEntity = {
      getNodeSchema: getNodeSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    node = createVisualizationNode('test', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'test-path',
      entity: visualEntity,
    });
    node.getNodeSchema();

    expect(getNodeSchemaSpy).toHaveBeenCalledWith(node.data.path);
  });

  it('should return the node definition from the underlying BaseVisualCamelEntity', () => {
    const getNodeDefinitionSpy = jest.fn();
    const visualEntity = {
      getNodeDefinition: getNodeDefinitionSpy,
    } as unknown as BaseVisualCamelEntity;

    node = createVisualizationNode('test', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'test-path',
      entity: visualEntity,
    });
    node.getNodeDefinition();

    expect(getNodeDefinitionSpy).toHaveBeenCalledWith(node.data.path);
  });

  it('should delegate getOmitFormFields() to the underlying BaseVisualCamelEntity', () => {
    const getOmitFormFieldsSpy = jest.fn();
    const visualEntity = {
      getOmitFormFields: getOmitFormFieldsSpy,
    } as unknown as BaseVisualCamelEntity;

    node = createVisualizationNode('test', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'test-path',
      entity: visualEntity,
    });
    node.getOmitFormFields();

    expect(getOmitFormFieldsSpy).toHaveBeenCalled();
  });

  describe('getNodeLabel', () => {
    it('should return the label from the underlying BaseVisualCamelEntity', () => {
      const getNodeLabelSpy = jest.fn().mockReturnValue('test-label');
      const visualEntity = {
        getNodeLabel: getNodeLabelSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'test-path',
        entity: visualEntity,
      });
      const label = node.getNodeLabel(NodeLabelType.Id);

      expect(getNodeLabelSpy).toHaveBeenCalledWith(node.data.path, NodeLabelType.Id);
      expect(label).toEqual('test-label');
    });

    it('should return the id when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });
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

      node = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'test-path',
        entity: visualEntity,
      });
      const content = node.getTooltipContent();

      expect(getTooltipContentSpy).toHaveBeenCalledWith(node.data.path);
      expect(content).toEqual('test-description');
    });

    it('should return the id when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });
      const content = node.getTooltipContent();

      expect(content).toEqual(node.id);
    });
  });

  it('should return the node schema from the root node', () => {
    /** Arrange */
    const getNodeSchemaSpy = jest.fn();
    const visualEntity = {
      getNodeSchema: getNodeSchemaSpy,
    } as unknown as BaseVisualCamelEntity;

    const rootNode = createVisualizationNode('test', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'test-path',
      entity: visualEntity,
    });
    node.setParentNode(rootNode);

    /** Act */
    node.getNodeSchema();

    /** Assert */
    expect(getNodeSchemaSpy).toHaveBeenCalledWith(node.data.path);
  });

  it('should return the node definition from the root node', () => {
    /** Arrange */
    const getNodeDefinitionSpy = jest.fn();
    const visualEntity = {
      getNodeDefinition: getNodeDefinitionSpy,
    } as unknown as BaseVisualCamelEntity;

    const rootNode = createVisualizationNode('test', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'test-path',
      entity: visualEntity,
    });
    node.setParentNode(rootNode);

    /** Act */
    node.getNodeDefinition();

    /** Assert */
    expect(getNodeDefinitionSpy).toHaveBeenCalledWith(node.data.path);
  });

  describe('updateModel', () => {
    it('should update the lastUpdate value', () => {
      const initialValue = node.lastUpdate;
      node.updateModel('test-value');

      expect(node.lastUpdate).not.toEqual(initialValue);
    });

    it('should update the model on the underlying BaseVisualCamelEntity', () => {
      const updateModelSpy = jest.fn();
      const visualEntity = {
        updateModel: updateModelSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'test-path',
        entity: visualEntity,
      });
      node.updateModel('test-value');

      expect(updateModelSpy).toHaveBeenCalledWith(node.data.path, 'test-value');
    });

    it('should update the model on the root node', () => {
      /** Arrange */
      const updateModelSpy = jest.fn();
      const visualEntity = {
        updateModel: updateModelSpy,
      } as unknown as BaseVisualCamelEntity;

      const rootNode = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        entity: visualEntity,
      });
      node.setParentNode(rootNode);

      /** Act */
      node.updateModel('test-value');

      /** Assert */
      expect(updateModelSpy).toHaveBeenCalledWith(node.data.path, 'test-value');
    });
  });

  it('should set the parent node', () => {
    const parentNode = createVisualizationNode('parent', { catalogKind: CatalogKind.Component, name: 'log' });
    node.setParentNode(parentNode);

    expect(node.getParentNode()).toEqual(parentNode);
  });

  it('should set the previous node', () => {
    const previousNode = createVisualizationNode('previous', { catalogKind: CatalogKind.Component, name: 'log' });
    node.setPreviousNode(previousNode);

    expect(node.getPreviousNode()).toEqual(previousNode);
  });

  it('should set the next node', () => {
    const nextNode = createVisualizationNode('next', { catalogKind: CatalogKind.Component, name: 'log' });
    node.setNextNode(nextNode);

    expect(node.getNextNode()).toEqual(nextNode);
  });

  it('should add a child', () => {
    const child = createVisualizationNode('child', { catalogKind: CatalogKind.Component, name: 'log' });
    node.addChild(child);

    expect(node.getChildren()).toEqual([child]);
    expect(child.getParentNode()).toEqual(node);
  });

  describe('getNodeInteraction', () => {
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
      node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log', entity: visualEntity });
      const expectedNodeInteraction = node.getNodeInteraction();

      expect(getNodeInteractionSpy).toHaveBeenCalledWith(node.data);
      expect(expectedNodeInteraction).toEqual(mockNodeInteraction);
    });

    it('should return DISABLED_NODE_INTERACTION when there is no underlying base entity', () => {
      node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });
      expect(node.getNodeInteraction()).toEqual(DISABLED_NODE_INTERACTION);
    });
  });

  describe('removeChild', () => {
    it('should remove a child', () => {
      const child = createVisualizationNode('child', { catalogKind: CatalogKind.Component, name: 'log' });
      node.addChild(child);
      child.removeChild();

      expect(node.getChildren()).toEqual([]);
      expect(child.getParentNode()).toBeUndefined();
    });

    it('should not error when removing a non-existing child', () => {
      const child = createVisualizationNode('child', { catalogKind: CatalogKind.Component, name: 'log' });
      child.removeChild();

      expect(node.getChildren()).toBeUndefined();
      expect(child.getParentNode()).toBeUndefined();
    });

    it('should delegate to the BaseVisualCamelEntity to remove the underlying child', () => {
      const camelRouteVisualEntityStub = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));

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
      expect(node.getChildren()?.[2].getNodeLabel()).toEqual('my-route');
      expect(node.getChildren()).toHaveLength(4);
      expect(node.getChildren()?.[3].data.isPlaceholder).toBe(true);
      expect(fromNode!.getChildren()).toHaveLength(0);
    });
  });

  describe('getNodeValidationText', () => {
    it('should return undefined when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });
      const validationText = node.getNodeValidationText();

      expect(validationText).toBeUndefined();
    });

    it('should return the validation text from the underlying BaseVisualCamelEntity', () => {
      const getNodeValidationTextSpy = jest.fn().mockReturnValue('test-validation-text');
      const visualEntity = {
        getNodeValidationText: getNodeValidationTextSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'test-path',
        entity: visualEntity,
      });
      const validationText = node.getNodeValidationText();

      expect(getNodeValidationTextSpy).toHaveBeenCalledWith(node.data.path);
      expect(validationText).toEqual('test-validation-text');
    });
  });

  describe('getCopiedContent', () => {
    it('should return undefined when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });
      const copiedContent = node.getCopiedContent();

      expect(copiedContent).toBeUndefined();
    });

    it('should return the validation text from the underlying BaseVisualCamelEntity', () => {
      const getCopiedContentSpy = jest.fn().mockReturnValue('test-copied-content');
      const visualEntity = {
        getCopiedContent: getCopiedContentSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'test-path',
        entity: visualEntity,
      });
      const copiedContent = node.getCopiedContent();

      expect(getCopiedContentSpy).toHaveBeenCalledWith(node.data.path);
      expect(copiedContent).toEqual('test-copied-content');
    });
  });

  describe('pasteBaseEntityStep', () => {
    const clipboardContent: IClipboardCopyObject = {
      type: SourceSchemaType.Route,
      name: 'log',
      definition: {
        id: 'log-test',
        message: '${body}',
      },
    };

    it('should return undefined when the underlying BaseVisualCamelEntity is not defined', () => {
      node = createVisualizationNode('test', { catalogKind: CatalogKind.Component, name: 'log' });
      const copiedContent = node.pasteBaseEntityStep(clipboardContent, AddStepMode.InsertChildStep);

      expect(copiedContent).toBeUndefined();
    });

    it('should delegate to the BaseVisualCamelEntity to paste the step', () => {
      const pasteStepSpy = jest.fn();
      const visualEntity = {
        pasteStep: pasteStepSpy,
      } as unknown as BaseVisualCamelEntity;

      node = createVisualizationNode('test', {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'test-path',
        entity: visualEntity,
      });

      /** call paste on set-header node */
      node!.pasteBaseEntityStep(clipboardContent, AddStepMode.InsertChildStep);
      expect(pasteStepSpy).toHaveBeenCalledTimes(1);
    });

    it('should paste the step', () => {
      const camelRouteVisualEntityStub = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));
      const clipboardContent: IClipboardCopyObject = {
        type: SourceSchemaType.Route,
        name: 'log',
        definition: {
          id: 'log-test',
          message: '${body}',
        },
      };

      node = camelRouteVisualEntityStub.toVizNode();
      const fromNode = node.getChildren()?.[0];

      /** Get set-header node */
      const setHeaderNode = node.getChildren()?.[1];

      /** call paste on set-header node */
      setHeaderNode!.pasteBaseEntityStep(clipboardContent, AddStepMode.AppendStep);

      /** Refresh the Viz Node */
      node = camelRouteVisualEntityStub.toVizNode();

      expect(node.getChildren()?.[0].getNodeLabel()).toEqual('timer');
      expect(node.getChildren()?.[1].getNodeLabel()).toEqual('set-header');
      expect(node.getChildren()?.[2].getNodeLabel()).toEqual('log');
      expect(node.getChildren()?.[3].getNodeLabel()).toEqual('choice');
      expect(node.getChildren()?.[4].getNodeLabel()).toEqual('my-route');
      expect(node.getChildren()).toHaveLength(6);
      expect(node.getChildren()?.[5].data.isPlaceholder).toBe(true);
      expect(fromNode!.getChildren()).toHaveLength(0);
    });
  });

  describe('getGroupIcons', () => {
    it('should delegate to base entity', () => {
      const mockEntity = {
        getGroupIcons: jest.fn().mockReturnValue([{ icon: 'play', title: 'Enabled' }]),
      } as unknown as BaseVisualCamelEntity;

      const node = createVisualizationNode('test-node', {
        entity: mockEntity,
        catalogKind: CatalogKind.Entity,
        name: 'test',
        path: 'route',
      });

      expect(node.getGroupIcons()).toEqual([{ icon: 'play', title: 'Enabled' }]);
      expect(mockEntity.getGroupIcons).toHaveBeenCalled();
    });

    it('should return empty array when entity is undefined', () => {
      const node = createVisualizationNode('test-node', {
        catalogKind: CatalogKind.Entity,
        name: 'test',
        path: 'route',
      });

      expect(node.getGroupIcons()).toEqual([]);
    });
  });
});
