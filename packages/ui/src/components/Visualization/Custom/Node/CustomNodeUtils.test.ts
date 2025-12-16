import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { IClipboardCopyObject } from '../../../../models/visualization/clipboard';
import { IInteractionType, IOnCopyAddon } from '../../../registers/interactions/node-interaction-addon.model';
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

  describe('handleValidNodeDrop', () => {
    const noopGetOnCopyAddons = jest.fn().mockReturnValue([]);

    it('should paste the dragged node as AppendStep when direction is forward', () => {
      handleValidNodeDrop(vizNode1, vizNode2, false, jest.fn(), noopGetOnCopyAddons);

      expect(vizNode2.pasteBaseEntityStep).toHaveBeenCalledWith(vizNode1.getCopiedContent(), AddStepMode.AppendStep);
      expect(vizNode1.removeChild).toHaveBeenCalled();
    });

    it('should paste the dragged node as PrependStep when direction is backward', () => {
      handleValidNodeDrop(vizNode2, vizNode1, false, jest.fn(), noopGetOnCopyAddons);

      expect(vizNode1.pasteBaseEntityStep).toHaveBeenCalledWith(vizNode2.getCopiedContent(), AddStepMode.PrependStep);
      expect(vizNode2.removeChild).toHaveBeenCalled();
    });

    it('should paste the dragged node as AppendStep when direction is forward, call the removeflow() instead', () => {
      const interceptVizNode = getMockVizNode('intercept');
      const interceptRouteConfigVizNode = getMockVizNode('routeConfiguration.intercept.1.intercept');
      (interceptVizNode.getNodeInteraction as jest.Mock).mockReturnValue({
        canRemoveStep: false,
        canRemoveFlow: true,
      });
      const removeFlowMock = jest.fn();
      handleValidNodeDrop(interceptVizNode, interceptRouteConfigVizNode, false, removeFlowMock, noopGetOnCopyAddons);

      expect(interceptRouteConfigVizNode.pasteBaseEntityStep).toHaveBeenCalledWith(
        interceptVizNode.getCopiedContent(),
        AddStepMode.AppendStep,
      );
      expect(removeFlowMock).toHaveBeenCalled();
    });

    it('should not paste the dragged node if the dragged node getCopiedContent() returns undefined', () => {
      (vizNode1.getCopiedContent as jest.Mock).mockReturnValueOnce(undefined);
      handleValidNodeDrop(vizNode1, vizNode2, false, jest.fn(), noopGetOnCopyAddons);

      expect(vizNode2.pasteBaseEntityStep).not.toHaveBeenCalled();
      expect(vizNode1.removeChild).not.toHaveBeenCalled();
    });

    it('should process copied content through onCopyAddon when provided', () => {
      const originalContent: IClipboardCopyObject = {
        type: SourceSchemaType.Route,
        name: 'kaoto-datamapper',
        definition: {},
      };
      const transformedContent: IClipboardCopyObject = {
        type: SourceSchemaType.Route,
        name: 'step',
        definition: {},
      };

      const datamapperVizNode = getMockVizNode('route.from.steps.0.step');
      (datamapperVizNode.getCopiedContent as jest.Mock).mockReturnValue(originalContent);

      const mockOnCopyAddon: IOnCopyAddon = {
        type: IInteractionType.ON_COPY,
        activationFn: jest.fn(),
        callback: jest.fn().mockReturnValue(transformedContent),
      };

      const getOnCopyAddons = jest.fn().mockReturnValue([mockOnCopyAddon]);

      handleValidNodeDrop(datamapperVizNode, vizNode2, false, jest.fn(), getOnCopyAddons);

      expect(getOnCopyAddons).toHaveBeenCalledWith(datamapperVizNode);
      expect(mockOnCopyAddon.callback).toHaveBeenCalledWith({
        sourceVizNode: datamapperVizNode,
        content: originalContent,
      });
      expect(vizNode2.pasteBaseEntityStep).toHaveBeenCalledWith(transformedContent, AddStepMode.AppendStep);
      expect(datamapperVizNode.removeChild).toHaveBeenCalled();
    });

    it('should not paste if onCopyAddon returns undefined', () => {
      const mockOnCopyAddon: IOnCopyAddon = {
        type: IInteractionType.ON_COPY,
        activationFn: jest.fn(),
        callback: jest.fn().mockReturnValue(undefined),
      };

      const getOnCopyAddons = jest.fn().mockReturnValue([mockOnCopyAddon]);

      handleValidNodeDrop(vizNode1, vizNode2, false, jest.fn(), getOnCopyAddons);

      expect(vizNode2.pasteBaseEntityStep).not.toHaveBeenCalled();
      expect(vizNode1.removeChild).not.toHaveBeenCalled();
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
});
