import { waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';

import { PlaceholderType } from '../../../../models/placeholder.constants';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { IOnCopyAddon } from '../../../registers/interactions/node-interaction-addon.model';
import { NoBendpointsEdge } from '../NoBendingEdge';
import { checkNodeDropCompatibility, getNodeDragAndDropDirection, handleValidNodeDrop } from './CustomNodeUtils';

describe('CustomNodeUtils', () => {
  const getMockVizNode = (path: string): IVisualizationNode => {
    return {
      data: { path: path },
      getId: vi.fn(),
      getCopiedContent: vi.fn().mockReturnValue('test-content'),
      pasteBaseEntityStep: vi.fn(),
      removeChild: vi.fn(),
      getNodeInteraction: vi.fn().mockReturnValue({
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
  placeholderNode.getPreviousNode = vi.fn().mockReturnValue(vizNode2);

  describe('getNodeDragAndDropDirection', () => {
    it('should return forward based on the path', () => {
      (vizNode1.getId as Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as Mock).mockReturnValueOnce('route1');

      const result = getNodeDragAndDropDirection(vizNode1, vizNode2, false);
      expect(result).toBe('forward');
    });

    it('should return backward based on the path', () => {
      (vizNode1.getId as Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as Mock).mockReturnValueOnce('route1');
      const result = getNodeDragAndDropDirection(vizNode2, vizNode1, false);
      expect(result).toBe('backward');
    });

    it('should return forward based on the entity id', () => {
      (vizNode1.getId as Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as Mock).mockReturnValueOnce('route2');
      const result = getNodeDragAndDropDirection(vizNode2, vizNode1, false);
      expect(result).toBe('forward');
    });

    it('should return forward when nodes are at the same level', () => {
      const whenLogNode = getMockVizNode('route.from.steps.0.choice.when.0.steps.0.log');
      const otherwisePlaceholderNode = getMockVizNode('route.from.steps.0.choice.otherwise.steps.0.placeholder');
      (whenLogNode.getId as Mock).mockReturnValueOnce('route');
      (otherwisePlaceholderNode.getId as Mock).mockReturnValueOnce('route');
      const result = getNodeDragAndDropDirection(whenLogNode, otherwisePlaceholderNode, false);
      expect(result).toBe('forward');
    });

    it('should return backward when a container sub-node is dragged backward and dropped on the container connected edge', () => {
      const whenLogNode = getMockVizNode('route.from.steps.0.choice.when.0.steps.0.log');
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      (whenLogNode.getId as Mock).mockReturnValueOnce('route');
      (choiceNode.getId as Mock).mockReturnValueOnce('route');
      const result = getNodeDragAndDropDirection(whenLogNode, choiceNode, true);
      expect(result).toBe('backward');
    });
  });

  describe('checkNodeDropCompatibility', () => {
    it('should return false if dragged node content is undefined', () => {
      (vizNode1.getCopiedContent as Mock).mockReturnValueOnce(undefined);
      const result = checkNodeDropCompatibility(vizNode1, vizNode2, vi.fn());
      expect(result).toBe(false);
    });

    it('should return false if dropped node content is undefined', () => {
      (vizNode2.getCopiedContent as Mock).mockReturnValueOnce(undefined);
      const result = checkNodeDropCompatibility(vizNode1, vizNode2, vi.fn());
      expect(result).toBe(false);
    });

    it('should return true for compatible nodes in case of when container', () => {
      const mockValidate = vi.fn().mockReturnValue(true);
      const when1Node = getMockVizNode('route.from.steps.0.choice.when.0');
      const when2Node = getMockVizNode('route.from.steps.0.choice.when.1');
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      choiceNode.getNodeInteraction = vi.fn().mockReturnValue({
        canHaveSpecialChildren: true,
      });
      when1Node.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      when2Node.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      when2Node.getParentNode = vi.fn().mockReturnValue(choiceNode);

      const result = checkNodeDropCompatibility(when1Node, when2Node, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).toHaveBeenCalled();
    });

    it('should return false for incompatible nodes in case of when container', () => {
      const mockValidate = vi.fn().mockReturnValue(true);

      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      const otherwiseNode = getMockVizNode('route.from.steps.0.choice.otherwise.1');
      whenNode.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      otherwiseNode.getCopiedContent = vi.fn().mockReturnValue({ name: 'otherwise' });
      const result = checkNodeDropCompatibility(whenNode, otherwiseNode, mockValidate);
      expect(result).toBe(false);
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it('should return true for compatible nodes in case of placeholder node', () => {
      const mockValidate = vi.fn().mockReturnValue(true);
      vizNode1.data.name = 'log';
      placeholderNode.data.name = PlaceholderType.Placeholder;
      const result = checkNodeDropCompatibility(vizNode1, placeholderNode, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).toHaveBeenCalled();
    });

    it('should return true when dropping when container onto when placeholder from another choice', () => {
      const mockValidate = vi.fn();
      const whenPlaceholder = getMockVizNode('route.from.steps.1.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      const choiceB = getMockVizNode('route.from.steps.1.choice');
      choiceB.data = { ...choiceB.data, processorName: 'choice' };
      whenPlaceholder.getParentNode = vi.fn().mockReturnValue(choiceB);

      const whenContainer = getMockVizNode('route.from.steps.0.choice.when.0');
      whenContainer.data = { ...whenContainer.data, name: 'when' };
      whenContainer.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      const choiceA = getMockVizNode('route.from.steps.0.choice');
      choiceA.data = { ...choiceA.data, processorName: 'choice' };
      (choiceA.getId as Mock).mockReturnValue('choice-a');
      (choiceB.getId as Mock).mockReturnValue('choice-b');
      whenContainer.getParentNode = vi.fn().mockReturnValue(choiceA);

      const result = checkNodeDropCompatibility(whenContainer, whenPlaceholder, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).not.toHaveBeenCalled();
    });

    it('should return false when dropping when container onto when placeholder from same choice', () => {
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      choiceNode.data = { ...choiceNode.data, processorName: 'choice' };
      (choiceNode.getId as Mock).mockReturnValue('same-choice');
      const whenPlaceholder = getMockVizNode('route.from.steps.0.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      whenPlaceholder.getParentNode = vi.fn().mockReturnValue(choiceNode);

      const whenContainer = getMockVizNode('route.from.steps.0.choice.when.0');
      whenContainer.data = { ...whenContainer.data, name: 'when' };
      whenContainer.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      whenContainer.getParentNode = vi.fn().mockReturnValue(choiceNode);

      const result = checkNodeDropCompatibility(whenContainer, whenPlaceholder, vi.fn());
      expect(result).toBe(false);
    });

    it('should return false when dropping non-when onto when placeholder', () => {
      const whenPlaceholder = getMockVizNode('route.from.steps.0.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      whenPlaceholder.getParentNode = vi.fn().mockReturnValue(choiceNode);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = vi.fn().mockReturnValue({ name: 'otherwise' });
      const otherChoice = getMockVizNode('route.from.steps.1.choice');
      (otherChoice.getId as Mock).mockReturnValue('other');
      (choiceNode.getId as Mock).mockReturnValue('choice');
      otherwiseContainer.getParentNode = vi.fn().mockReturnValue(otherChoice);

      const result = checkNodeDropCompatibility(otherwiseContainer, whenPlaceholder, vi.fn());
      expect(result).toBe(false);
    });

    it('should return false when dropping log onto choice', () => {
      const logNode = getMockVizNode('route.from.steps.0.log');
      const choiceContainer = getMockVizNode('route.from.steps.1.choice');
      choiceContainer.getParentNode = vi.fn().mockReturnValue(undefined);

      const result = checkNodeDropCompatibility(logNode, choiceContainer, vi.fn());
      expect(result).toBe(false);
    });

    it('should return true when dropping otherwise container onto otherwise placeholder from another choice', () => {
      const otherwisePlaceholder = getMockVizNode('route.from.steps.1.choice.otherwise');
      otherwisePlaceholder.data = { ...otherwisePlaceholder.data, name: 'otherwise', isPlaceholder: true };
      otherwisePlaceholder.getCopiedContent = vi.fn().mockReturnValue({ name: 'otherwise' });
      const choiceB = getMockVizNode('route.from.steps.1.choice');
      otherwisePlaceholder.getParentNode = vi.fn().mockReturnValue(choiceB);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = vi.fn().mockReturnValue({ name: 'otherwise' });
      const choiceA = getMockVizNode('route.from.steps.0.choice');
      (choiceA.getId as Mock).mockReturnValue('choice-a');
      (choiceB.getId as Mock).mockReturnValue('choice-b');
      otherwiseContainer.getParentNode = vi.fn().mockReturnValue(choiceA);

      const result = checkNodeDropCompatibility(otherwiseContainer, otherwisePlaceholder, vi.fn());
      expect(result).toBe(true);
    });

    it('should return false when dropping otherwise onto otherwise placeholder from same choice', () => {
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      (choiceNode.getId as Mock).mockReturnValue('same-choice');
      const otherwisePlaceholder = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwisePlaceholder.data = { ...otherwisePlaceholder.data, name: 'otherwise', isPlaceholder: true };
      otherwisePlaceholder.getCopiedContent = vi.fn().mockReturnValue({ name: 'otherwise' });
      otherwisePlaceholder.getParentNode = vi.fn().mockReturnValue(choiceNode);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = vi.fn().mockReturnValue({ name: 'otherwise' });
      otherwiseContainer.getParentNode = vi.fn().mockReturnValue(choiceNode);

      const result = checkNodeDropCompatibility(otherwiseContainer, otherwisePlaceholder, vi.fn());
      expect(result).toBe(false);
    });

    it('should return false when dragged node is choice and target is a branch placeholder inside of the same choice', () => {
      const choiceNode = getMockVizNode('route.from.steps.0.choice');
      (choiceNode.getId as Mock).mockReturnValue('same-choice');
      const whenBranchPlaceholder = getMockVizNode('route.from.steps.0.choice.when.0.steps.0.placeholder');
      whenBranchPlaceholder.data = {
        ...whenBranchPlaceholder.data,
        name: PlaceholderType.Placeholder,
        isPlaceholder: true,
      };
      whenBranchPlaceholder.getPreviousNode = vi.fn().mockReturnValue(undefined);
      whenBranchPlaceholder.getId = vi.fn().mockReturnValue('same-choice');

      const result = checkNodeDropCompatibility(choiceNode, whenBranchPlaceholder, vi.fn());
      expect(result).toBe(false);
    });

    it('should return false when dragged node is a when and target is when-placeholder inside of the same when', () => {
      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      (whenNode.getId as Mock).mockReturnValue('test');
      const whenPlaceholderInsideSameWhen = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice.when');
      whenPlaceholderInsideSameWhen.getId = vi.fn().mockReturnValue('test');

      const result = checkNodeDropCompatibility(whenNode, whenPlaceholderInsideSameWhen, vi.fn());
      expect(result).toBe(false);
    });

    it('should return false when dragged node is a when and target is another when inside of the same when', () => {
      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      (whenNode.getId as Mock).mockReturnValue('test');
      const whenInsideSameWhen = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice.when.0');
      whenInsideSameWhen.getId = vi.fn().mockReturnValue('test');

      const result = checkNodeDropCompatibility(whenNode, whenInsideSameWhen, vi.fn());
      expect(result).toBe(false);
    });

    it('should return true when dragged node is a when and target is another when not inside of the same when', () => {
      const mockValidate = vi.fn().mockReturnValue(true);
      const whenNode = getMockVizNode('route.from.steps.0.choice.when.0');
      whenNode.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      (whenNode.getId as Mock).mockReturnValue('test1');
      const choiceNode = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice');
      const AnotherWhen = getMockVizNode('route.from.steps.0.choice.when.0.steps.1.choice.when.0');
      AnotherWhen.getId = vi.fn().mockReturnValue('test2');
      AnotherWhen.getParentNode = vi.fn().mockReturnValue(choiceNode);
      AnotherWhen.getCopiedContent = vi.fn().mockReturnValue({ name: 'when' });
      choiceNode.getNodeInteraction = vi.fn().mockReturnValue({
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
      getData: vi.fn().mockReturnValue({ vizNode }),
      getController: vi.fn().mockReturnValue({
        fromModel: vi.fn(),
      }),
    });

    const createMockDropResultNode = (vizNode: IVisualizationNode) => ({
      getData: vi.fn().mockReturnValue({ vizNode }),
    });

    const createMockEntitiesContext = () => ({
      camelResource: { removeEntity: vi.fn() },
      updateEntitiesFromCamelResource: vi.fn(),
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return early when dragged element has no vizNode', () => {
      const draggedElement = createMockDraggedElement(vizNode1);
      (draggedElement.getData as Mock).mockReturnValue({});
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
      (vizNode1.getCopiedContent as Mock).mockReturnValueOnce(undefined);
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
      (vizNode1.getId as Mock).mockReturnValue('route1');
      (vizNode2.getId as Mock).mockReturnValue('route1');
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
      (vizNode1.getId as Mock).mockReturnValue('route1');
      (vizNode2.getId as Mock).mockReturnValue('route1');
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
      (vizNode1.getNodeInteraction as Mock).mockReturnValue({
        canHaveNextStep: true,
        canHavePreviousStep: true,
        canRemoveStep: false,
        canRemoveFlow: true,
      });
      (vizNode1.getId as Mock).mockReturnValue('route1');
      (vizNode2.getId as Mock).mockReturnValue('route1');
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
      choiceVizNode.getNodeInteraction = vi.fn().mockReturnValue({
        canHaveSpecialChildren: true,
      });
      const whenPlaceholder = getMockVizNode('route.from.steps.1.choice.when');
      whenPlaceholder.data = { ...whenPlaceholder.data, name: 'when', isPlaceholder: true };
      whenPlaceholder.getParentNode = vi.fn().mockReturnValue(choiceVizNode);

      const whenContainer = getMockVizNode('route.from.steps.0.choice.when.0');
      whenContainer.data = { ...whenContainer.data, name: 'when' };
      whenContainer.getCopiedContent = vi.fn().mockReturnValue({ name: 'when', type: 'processor', definition: {} });

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
      choiceVizNode.getNodeInteraction = vi.fn().mockReturnValue({
        canHaveSpecialChildren: true,
      });
      const otherwisePlaceholder = getMockVizNode('route.from.steps.1.choice.otherwise');
      otherwisePlaceholder.data = { ...otherwisePlaceholder.data, name: 'otherwise', isPlaceholder: true };
      otherwisePlaceholder.getParentNode = vi.fn().mockReturnValue(choiceVizNode);

      const otherwiseContainer = getMockVizNode('route.from.steps.0.choice.otherwise');
      otherwiseContainer.data = { ...otherwiseContainer.data, name: 'otherwise' };
      otherwiseContainer.getCopiedContent = vi.fn().mockReturnValue({
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
      (vizNode1.getId as Mock).mockReturnValue('route1');
      (vizNode2.getId as Mock).mockReturnValue('route1');
      (vizNode1.getNodeInteraction as Mock).mockReturnValue({
        canHaveNextStep: true,
        canHavePreviousStep: true,
        canRemoveStep: true,
        canRemoveFlow: false,
      });
      const draggedElement = createMockDraggedElement(vizNode1);
      const edge = new NoBendpointsEdge();
      const mockTarget = { getData: vi.fn().mockReturnValue({ vizNode: vizNode2 }) };
      vi.spyOn(edge, 'getTarget').mockReturnValue(mockTarget as never);
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
