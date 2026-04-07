import { waitFor } from '@testing-library/react';

import { PlaceholderType } from '../../../../models/placeholder.constants';
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
      vizNode1.data.name = 'log';
      placeholderNode.data.name = PlaceholderType.Placeholder;
      const result = checkNodeDropCompatibility(vizNode1, placeholderNode, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).toHaveBeenCalled();
    });

    it('should return true when dropping when container onto when placeholder from another choice', () => {
      const mockValidate = jest.fn();
      const whenPlaceholder = getMockVizNode('route.from.steps.1.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      const choiceB = getMockVizNode('route.from.steps.1.choice');
      choiceB.data = { ...choiceB.data, processorName: 'choice' };
      whenPlaceholder.getParentNode = jest.fn().mockReturnValue(choiceB);

      const whenContainer = getMockVizNode('route.from.steps.0.choice.when.0');
      whenContainer.data = { ...whenContainer.data, name: 'when' };
      whenContainer.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      const choiceA = getMockVizNode('route.from.steps.0.choice');
      choiceA.data = { ...choiceA.data, processorName: 'choice' };
      (choiceA.getId as jest.Mock).mockReturnValue('choice-a');
      (choiceB.getId as jest.Mock).mockReturnValue('choice-b');
      whenContainer.getParentNode = jest.fn().mockReturnValue(choiceA);

      const result = checkNodeDropCompatibility(whenContainer, whenPlaceholder, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it('should return false when dropping when container onto when placeholder from same choice', () => {
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      choiceNode.data = { ...choiceNode.data, processorName: 'choice' };
      (choiceNode.getId as jest.Mock).mockReturnValue('same-choice');
      const whenPlaceholder = getMockVizNode('route.from.steps.0.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      whenPlaceholder.getParentNode = jest.fn().mockReturnValue(choiceNode);

      const whenContainer = getMockVizNode('route.from.steps.0.choice.when.0');
      whenContainer.data = { ...whenContainer.data, name: 'when' };
      whenContainer.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      whenContainer.getParentNode = jest.fn().mockReturnValue(choiceNode);

      const result = checkNodeDropCompatibility(whenContainer, whenPlaceholder, jest.fn());
      expect(result).toBe(false);
    });

    it('should return false when dropping non-when onto when placeholder', () => {
      const whenPlaceholder = getMockVizNode('route.from.steps.0.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      whenPlaceholder.getParentNode = jest.fn().mockReturnValue(choiceNode);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = jest.fn().mockReturnValue({ name: 'otherwise' });
      const otherChoice = getMockVizNode('route.from.steps.1.choice');
      (otherChoice.getId as jest.Mock).mockReturnValue('other');
      (choiceNode.getId as jest.Mock).mockReturnValue('choice');
      otherwiseContainer.getParentNode = jest.fn().mockReturnValue(otherChoice);

      const result = checkNodeDropCompatibility(otherwiseContainer, whenPlaceholder, jest.fn());
      expect(result).toBe(false);
    });

    it('should return false when dropping log onto choice', () => {
      const logNode = getMockVizNode('route.from.steps.0.log');
      const choiceContainer = getMockVizNode('route.from.steps.1.choice');
      choiceContainer.getParentNode = jest.fn().mockReturnValue(undefined);

      const result = checkNodeDropCompatibility(logNode, choiceContainer, jest.fn());
      expect(result).toBe(false);
    });

    it('should return true when dropping otherwise container onto otherwise placeholder from another choice', () => {
      const otherwisePlaceholder = getMockVizNode('route.from.steps.1.choice.otherwise');
      otherwisePlaceholder.data = { ...otherwisePlaceholder.data, name: 'otherwise', isPlaceholder: true };
      otherwisePlaceholder.getCopiedContent = jest.fn().mockReturnValue({ name: 'otherwise' });
      const choiceB = getMockVizNode('route.from.steps.1.choice');
      otherwisePlaceholder.getParentNode = jest.fn().mockReturnValue(choiceB);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = jest.fn().mockReturnValue({ name: 'otherwise' });
      const choiceA = getMockVizNode('route.from.steps.0.choice');
      (choiceA.getId as jest.Mock).mockReturnValue('choice-a');
      (choiceB.getId as jest.Mock).mockReturnValue('choice-b');
      otherwiseContainer.getParentNode = jest.fn().mockReturnValue(choiceA);

      const result = checkNodeDropCompatibility(otherwiseContainer, otherwisePlaceholder, jest.fn());
      expect(result).toBe(true);
    });

    it('should return false when dropping otherwise onto otherwise placeholder from same choice', () => {
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      (choiceNode.getId as jest.Mock).mockReturnValue('same-choice');
      const otherwisePlaceholder = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwisePlaceholder.data = { ...otherwisePlaceholder.data, name: 'otherwise', isPlaceholder: true };
      otherwisePlaceholder.getCopiedContent = jest.fn().mockReturnValue({ name: 'otherwise' });
      otherwisePlaceholder.getParentNode = jest.fn().mockReturnValue(choiceNode);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = jest.fn().mockReturnValue({ name: 'otherwise' });
      otherwiseContainer.getParentNode = jest.fn().mockReturnValue(choiceNode);

      const result = checkNodeDropCompatibility(otherwiseContainer, otherwisePlaceholder, jest.fn());
      expect(result).toBe(false);
    });

    it('should return false when dragged node is choice and target is a branch placeholder inside of the same choice', () => {
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      (choiceNode.getId as jest.Mock).mockReturnValue('same-choice');
      const whenBranchPlaceholder = getMockVizNode('route.from.steps.0.choice.when.0.steps.0.placeholder');
      whenBranchPlaceholder.data = {
        ...whenBranchPlaceholder.data,
        name: PlaceholderType.Placeholder,
        isPlaceholder: true,
      };
      whenBranchPlaceholder.getPreviousNode = jest.fn().mockReturnValue(undefined);
      whenBranchPlaceholder.getId = jest.fn().mockReturnValue('same-choice');

      const result = checkNodeDropCompatibility(choiceNode, whenBranchPlaceholder, jest.fn());
      expect(result).toBe(false);
    });

    it('should return false when dragged node is a when and target is when-placeholder inside of the same when', () => {
      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      (whenNode.getId as jest.Mock).mockReturnValue('test');
      const whenPlaceholderInsideSameWhen = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice.when');
      whenPlaceholderInsideSameWhen.getId = jest.fn().mockReturnValue('test');

      const result = checkNodeDropCompatibility(whenNode, whenPlaceholderInsideSameWhen, jest.fn());
      expect(result).toBe(false);
    });

    it('should return false when dragged node is a when and target is another when inside of the same when', () => {
      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      (whenNode.getId as jest.Mock).mockReturnValue('test');
      const whenInsideSameWhen = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice.when.0');
      whenInsideSameWhen.getId = jest.fn().mockReturnValue('test');

      const result = checkNodeDropCompatibility(whenNode, whenInsideSameWhen, jest.fn());
      expect(result).toBe(false);
    });

    it('should return true when dragged node is a when and target is another when not inside of the same when', () => {
      const mockValidate = jest.fn().mockReturnValue(true);
      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      whenNode.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      (whenNode.getId as jest.Mock).mockReturnValue('test1');
      const choiceNode = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice');
      const AnotherWhen = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice.when.0');
      AnotherWhen.getId = jest.fn().mockReturnValue('test2');
      AnotherWhen.getParentNode = jest.fn().mockReturnValue(choiceNode);
      AnotherWhen.getCopiedContent = jest.fn().mockReturnValue({ name: 'when' });
      choiceNode.getNodeInteraction = jest.fn().mockReturnValue({
        canHaveSpecialChildren: true,
      });

      const result = checkNodeDropCompatibility(whenNode, AnotherWhen, mockValidate);
      expect(result).toBe(true);
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

    it('should handle drop onto when placeholder: remove dragged when and add to choice at start', async () => {
      const choiceVizNode = getMockVizNode('route.from.steps.1.choice');
      choiceVizNode.getNodeInteraction = jest.fn().mockReturnValue({
        canHaveSpecialChildren: true,
      });
      const whenPlaceholder = getMockVizNode('route.from.steps.1.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getParentNode = jest.fn().mockReturnValue(choiceVizNode);

      const whenContainer = getMockVizNode('route.from.steps.0.choice.when.0');
      whenContainer.data = { ...whenContainer.data, name: 'when' };
      whenContainer.getCopiedContent = jest.fn().mockReturnValue({ name: 'when', type: 'processor', definition: {} });

      const draggedElement = createMockDraggedElement(whenContainer);
      const dropResult = createMockDropResultNode(whenPlaceholder);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        dropResult as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(choiceVizNode.pasteBaseEntityStep).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'when', definition: {} }),
        AddStepMode.InsertSpecialChildStep,
        true,
      );
      expect(whenContainer.removeChild).toHaveBeenCalled();
      expect(draggedElement.getController().fromModel).toHaveBeenCalledWith({ nodes: [], edges: [] });
      await waitFor(() => {
        expect(entitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
      });
    });

    it('should handle drop onto otherwise placeholder: remove dragged otherwise and add to choice', async () => {
      const choiceVizNode = getMockVizNode('route.from.steps.1.choice');
      choiceVizNode.getNodeInteraction = jest.fn().mockReturnValue({
        canHaveSpecialChildren: true,
      });
      const otherwisePlaceholder = getMockVizNode('route.from.steps.1.choice.otherwise');
      otherwisePlaceholder.data = { ...otherwisePlaceholder.data, name: 'otherwise', isPlaceholder: true };
      otherwisePlaceholder.getParentNode = jest.fn().mockReturnValue(choiceVizNode);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = jest.fn().mockReturnValue({
        name: 'otherwise',
        type: 'processor',
        definition: {},
      });

      const draggedElement = createMockDraggedElement(otherwiseContainer);
      const dropResult = createMockDropResultNode(otherwisePlaceholder);
      const entitiesContext = createMockEntitiesContext();

      handleValidNodeDrop(
        draggedElement as never,
        dropResult as never,
        entitiesContext as never,
        { getRegisteredInteractionAddons: noopGetOnCopyAddons } as never,
      );

      expect(otherwiseContainer.removeChild).toHaveBeenCalled();
      expect(choiceVizNode.pasteBaseEntityStep).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'otherwise', definition: {} }),
        AddStepMode.InsertSpecialChildStep,
        true,
      );
      expect(draggedElement.getController().fromModel).toHaveBeenCalledWith({ nodes: [], edges: [] });
      await waitFor(() => {
        expect(entitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
      });
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
