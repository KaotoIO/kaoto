import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
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

  describe('getNodeDragAndDropDirection', () => {
    it('should return the forward based on the path', () => {
      (vizNode1.getId as jest.Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as jest.Mock).mockReturnValueOnce('route1');

      const result = getNodeDragAndDropDirection(vizNode1, vizNode2);
      expect(result).toBe('forward');
    });

    it('should return the backward based on the path', () => {
      (vizNode1.getId as jest.Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as jest.Mock).mockReturnValueOnce('route1');
      const result = getNodeDragAndDropDirection(vizNode2, vizNode1);
      expect(result).toBe('backward');
    });

    it('should return the forward based on the entity id', () => {
      (vizNode1.getId as jest.Mock).mockReturnValueOnce('route1');
      (vizNode2.getId as jest.Mock).mockReturnValueOnce('route2');
      const result = getNodeDragAndDropDirection(vizNode2, vizNode1);
      expect(result).toBe('forward');
    });

    it('should return the forward when nodes are at the same level', () => {
      const whenLogNode = getMockVizNode('route.from.steps.0.choice.when.0.steps.0.log');
      const otherwisePlaceholderNode = getMockVizNode('route.from.steps.0.choice.otherwise.steps.0.placeholder');
      (whenLogNode.getId as jest.Mock).mockReturnValueOnce('route');
      (otherwisePlaceholderNode.getId as jest.Mock).mockReturnValueOnce('route');
      const result = getNodeDragAndDropDirection(whenLogNode, otherwisePlaceholderNode);
      expect(result).toBe('forward');
    });
  });

  describe('handleValidNodeDrop', () => {
    it('should paste the dragged node as AppendStep when direction is forward', () => {
      handleValidNodeDrop(vizNode1, vizNode2, jest.fn());

      expect(vizNode2.pasteBaseEntityStep).toHaveBeenCalledWith(vizNode1.getCopiedContent(), AddStepMode.AppendStep);
      expect(vizNode1.removeChild).toHaveBeenCalled();
    });

    it('should paste the dragged node as PrependStep when direction is backward', () => {
      handleValidNodeDrop(vizNode2, vizNode1, jest.fn());

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
      handleValidNodeDrop(interceptVizNode, interceptRouteConfigVizNode, removeFlowMock);

      expect(interceptRouteConfigVizNode.pasteBaseEntityStep).toHaveBeenCalledWith(
        interceptVizNode.getCopiedContent(),
        AddStepMode.AppendStep,
      );
      expect(removeFlowMock).toHaveBeenCalled();
    });

    it('should not paste the dragged node if the dragged node getCopiedContent() returns undefined', () => {
      (vizNode1.getCopiedContent as jest.Mock).mockReturnValueOnce(undefined);
      handleValidNodeDrop(vizNode1, vizNode2, jest.fn());

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

    it('should return true for compatible nodes', () => {
      const mockValidate = jest.fn().mockReturnValue(true);
      const result = checkNodeDropCompatibility(vizNode1, vizNode2, mockValidate);
      expect(result).toBe(true);
      expect(mockValidate).toHaveBeenCalled();
    });

    it('should return false for incompatible nodes', () => {
      const mockValidate = jest.fn().mockReturnValue(false);
      const result = checkNodeDropCompatibility(vizNode1, vizNode2, mockValidate);
      expect(result).toBe(false);
      expect(mockValidate).toHaveBeenCalled();
    });
  });
});
