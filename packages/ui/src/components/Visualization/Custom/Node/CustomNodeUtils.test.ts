import { waitFor } from '@testing-library/react';

import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { IOnCopyAddon } from '../../../registers/interactions/node-interaction-addon.model';
import { NoBendpointsEdge } from '../NoBendingEdge';
import { checkNodeDropCompatibility, getNodeDragAndDropDirection, handleValidNodeDrop } from './CustomNodeUtils';

describe('CustomNodeUtils', () => {
  const getMockVizNode = (path: string): IVisualizationNode => {
    return {
      data: { path: path },
      getId: jest.fn(),
      getCopiedContent: jest.fn().mockReturnValue('test-content'),
      pasteBaseEntityStep: jest.fn(),
      removeChild: jest.fn(),
      getNodeInteraction: jest.fn().mockReturnValue({
        canHaveNextStep: true,
        canHavePreviousStep: true,
        canRemoveStep: true,
        canRemoveFlow: false,
      }),
    } as unknown as IVisualizationNode;
  };
  const vizNode1 = getMockVizNode('route.from.steps.0.log');
  const vizNode2 = getMockVizNode('route.from.steps.2.setHeader');
  const placeholderNode = getMockVizNode('route.from.steps.3.placeholder');
  placeholderNode.data.isPlaceholder = true;
  placeholderNode.getPreviousNode = jest.fn().mockReturnValue(vizNode2);

  describe('getNodeDragAndDropDirection', () => {
    it('should return forward based on the path', () => {
      (vizNode1.getId as jest.Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as jest.Mock).mockReturnValueOnce('route1');

      const result = getNodeDragAndDropDirection(vizNode1, vizNode2, false);
      expect(result).toBe('forward');
    });

    it('should return backward based on the path', () => {
      (vizNode1.getId as jest.Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as jest.Mock).mockReturnValueOnce('route1');
      const result = getNodeDragAndDropDirection(vizNode2, vizNode1, false);
      expect(result).toBe('backward');
    });

    it('should return forward based on the entity id', () => {
      (vizNode1.getId as jest.Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as jest.Mock).mockReturnValueOnce('route2');
      const result = getNodeDragAndDropDirection(vizNode2, vizNode1, false);
      expect(result).toBe('forward');
    });

    it('should return forward when nodes are at the same level', () => {
      const whenLogNode = getMockVizNode('route.from.steps.0.choice.when.0.steps.0.log');
      const otherwisePlaceholderNode = getMockVizNode('route.from.steps.0.choice.otherwise.steps.0.placeholder');
      (whenLogNode.getId as jest.Mock).mockReturnValueOnce('route');
      (otherwisePlaceholderNode.getId as jest.Mock).mockReturnValueOnce('route');
      const result = getNodeDragAndDropDirection(whenLogNode, otherwisePlaceholderNode, false);
      expect(result).toBe('forward');
    });

    it('should return backward when a container sub-node is dragged backward and dropped on the container connected edge', () => {
      const whenLogNode = getMockVizNode('route.from.steps.0.choice.when.0.steps.0.log');
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      (whenLogNode.getId as jest.Mock).mockReturnValueOnce('route');
      (choiceNode.getId as jest.Mock).mockReturnValueOnce('route');
      const result = getNodeDragAndDropDirection(whenLogNode, choiceNode, true);
      expect(result).toBe('backward');
    });
  });

  describe('checkNodeDropCompatibility', () => {
    it('should return false if dragged node content is undefined', () => {
      (vizNode1.getCopiedContent as jest.Mock).mockReturnValueOnce(undefined);
      const result = checkNodeDropCompatibility(vizNode1, vizNode2, jest.fn());
      expect(result).toBe(false);
    });

    it('should return false if dropped node content is undefined', () => {
      (vizNode2.getCopiedContent as jest.Mock).mockReturnValueOnce(undefined);
      const result = checkNodeDropCompatibility(vizNode1, vizNode2, jest.fn());
      expect(result).toBe(false);
    });

    it('should return true for compatible nodes in case of when container', () => {
      const mockValidate = jest.fn().mockReturnValue(true);
      const when1Node = getMockVizNode('route.from.steps.0.choice.when.0');
      const when2Node = getMockVizNode('route.from.steps.0.choice.when.1');
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      choiceNode.getNodeInteraction = jest.fn().mockReturnValue({
        canHaveSpecialChildren: true,
      });
      when1Node.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      when2Node.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      when2Node.getParentNode = jest.fn().mockReturnValue(choiceNode);

      const result = checkNodeDropCompatibility(when1Node, when2Node, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).toHaveBeenCalled();
    });

    it('should return false for incompatible nodes in case of when container', () => {
      const mockValidate = jest.fn().mockReturnValue(true);

      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      const otherwiseNode = getMockVizNode('route.from.steps.0.choice.otherwise.1');
      whenNode.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      otherwiseNode.getCopiedContent = jest.fn().mockReturnValue({ name: 'otherwise' });
      const result = checkNodeDropCompatibility(whenNode, otherwiseNode, mockValidate);
      expect(result).toBe(false);
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it('should return true for compatible nodes in case of placeholder node', () => {
      const mockValidate = jest.fn().mockReturnValue(true);
      const result = checkNodeDropCompatibility(vizNode1, placeholderNode, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).toHaveBeenCalled();
    });

    it('should return false for incompatible nodes in case of when container', () => {
      const mockValidate = jest.fn().mockReturnValue(false);

      const result = checkNodeDropCompatibility(vizNode1, placeholderNode, mockValidate);
      expect(result).toBe(false);
      expect(mockValidate).toHaveBeenCalled();
    });
  });

  describe('handleValidNodeDrop', () => {
    const noopGetOnCopyAddons = () => [] as IOnCopyAddon[];

    const createMockDraggedElement = (vizNode: IVisualizationNode) => ({
      getData: jest.fn().mockReturnValue({ vizNode }),
      getController: jest.fn().mockReturnValue({
        fromModel: jest.fn(),
      }),
    });

    const createMockDropResultNode = (vizNode: IVisualizationNode) => ({
      getData: jest.fn().mockReturnValue({ vizNode }),
    });

    const createMockEntitiesContext = () => ({
      camelResource: { removeEntity: jest.fn() },
      updateEntitiesFromCamelResource: jest.fn(),
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return early when dragged element has no vizNode', () => {
      const draggedElement = createMockDraggedElement(vizNode1);
      (draggedElement.getData as jest.Mock).mockReturnValue({});
      const dropResult = createMockDropResultNode(vizNode2);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        dropResult as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(vizNode2.pasteBaseEntityStep).not.toHaveBeenCalled();
      expect(vizNode1.removeChild).not.toHaveBeenCalled();
      expect(draggedElement.getController().fromModel).not.toHaveBeenCalled();
    });

    it('should return early when getCopiedContent returns undefined', () => {
      (vizNode1.getCopiedContent as jest.Mock).mockReturnValueOnce(undefined);
      const draggedElement = createMockDraggedElement(vizNode1);
      const dropResult = createMockDropResultNode(vizNode2);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        dropResult as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(vizNode2.pasteBaseEntityStep).not.toHaveBeenCalled();
      expect(vizNode1.removeChild).not.toHaveBeenCalled();
    });

    it('should paste and remove on forward direction (drop on node)', async () => {
      (vizNode1.getId as jest.Mock).mockReturnValue('route1');
      (vizNode2.getId as jest.Mock).mockReturnValue('route1');
      const draggedElement = createMockDraggedElement(vizNode1);
      const dropResult = createMockDropResultNode(vizNode2);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        dropResult as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(vizNode2.pasteBaseEntityStep).toHaveBeenCalledWith('test-content', AddStepMode.AppendStep);
      expect(vizNode1.removeChild).toHaveBeenCalled();
      expect(draggedElement.getController().fromModel).toHaveBeenCalledWith({ nodes: [], edges: [] });

      await waitFor(() => {
        expect(entitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
      });
    });

    it('should paste and remove on backward direction', () => {
      (vizNode1.getId as jest.Mock).mockReturnValue('route1');
      (vizNode2.getId as jest.Mock).mockReturnValue('route1');
      const draggedElement = createMockDraggedElement(vizNode2);
      const dropResult = createMockDropResultNode(vizNode1);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        dropResult as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(vizNode2.removeChild).toHaveBeenCalled();
      expect(vizNode1.pasteBaseEntityStep).toHaveBeenCalledWith('test-content', AddStepMode.PrependStep);
      expect(draggedElement.getController().fromModel).toHaveBeenCalledWith({ nodes: [], edges: [] });
    });

    it('should call removeEntity when canRemoveStep is false and canRemoveFlow is true', () => {
      (vizNode1.getNodeInteraction as jest.Mock).mockReturnValue({
        canHaveNextStep: true,
        canHavePreviousStep: true,
        canRemoveStep: false,
        canRemoveFlow: true,
      });
      (vizNode1.getId as jest.Mock).mockReturnValue('route1');
      (vizNode2.getId as jest.Mock).mockReturnValue('route1');
      const draggedElement = createMockDraggedElement(vizNode1);
      const dropResult = createMockDropResultNode(vizNode2);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        dropResult as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(vizNode2.pasteBaseEntityStep).toHaveBeenCalledWith('test-content', AddStepMode.AppendStep);
      expect(vizNode1.removeChild).not.toHaveBeenCalled();
      expect(entitiesContext.camelResource.removeEntity).toHaveBeenCalledWith(['route1']);
    });

    it('should use edge target as drop target when dropResult is NoBendpointsEdge (drop on edge)', async () => {
      (vizNode1.getId as jest.Mock).mockReturnValue('route1');
      (vizNode2.getId as jest.Mock).mockReturnValue('route1');
      (vizNode1.getNodeInteraction as jest.Mock).mockReturnValue({
        canHaveNextStep: true,
        canHavePreviousStep: true,
        canRemoveStep: true,
        canRemoveFlow: false,
      });
      const draggedElement = createMockDraggedElement(vizNode1);
      const edge = new NoBendpointsEdge();
      const mockTarget = { getData: jest.fn().mockReturnValue({ vizNode: vizNode2 }) };
      jest.spyOn(edge, 'getTarget').mockReturnValue(mockTarget as never);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        edge as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(vizNode2.pasteBaseEntityStep).toHaveBeenCalledWith('test-content', AddStepMode.PrependStep);
      expect(vizNode1.removeChild).toHaveBeenCalled();
      expect(draggedElement.getController().fromModel).toHaveBeenCalledWith({ nodes: [], edges: [] });

      await waitFor(() => {
        expect(entitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
      });
    });
  });
});
