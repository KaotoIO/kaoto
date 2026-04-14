import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import { MappingTree } from '../../models/datamapper/mapping';
import { NodeData } from '../../models/datamapper/visualization';
import { MappingValidationService } from '../../services/mapping-validation.service';
import { VisualizationService } from '../../services/visualization.service';
import { SourceTargetDnDHandler } from './SourceTargetDnDHandler';

jest.mock('../../services/mapping-validation.service', () => ({
  MappingValidationService: {
    validateMappingPair: jest.fn(),
    isDraggable: jest.fn(),
  },
}));

jest.mock('../../services/visualization.service', () => ({
  VisualizationService: {
    engageMapping: jest.fn(),
  },
}));

const makeDragEvent = (fromNode?: NodeData, toNode?: NodeData) =>
  ({
    active: { id: 'a', data: { current: fromNode } },
    over: toNode ? { id: 'b', data: { current: toNode } } : null,
  }) as unknown as DragEndEvent;

describe('SourceTargetDnDHandler', () => {
  let handler: SourceTargetDnDHandler;
  let mockMappingTree: MappingTree;
  let mockOnUpdate: jest.Mock;
  let mockValidateMappingPair: jest.Mock;
  let mockEngageMapping: jest.Mock;
  let mockIsDraggable: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new SourceTargetDnDHandler();
    mockMappingTree = {} as MappingTree;
    mockOnUpdate = jest.fn();
    mockValidateMappingPair = MappingValidationService.validateMappingPair as jest.Mock;
    mockEngageMapping = VisualizationService.engageMapping as jest.Mock;
    mockIsDraggable = MappingValidationService.isDraggable as jest.Mock;
  });

  describe('handleDragEnd', () => {
    it('should return { success: false } when fromNode is undefined', () => {
      const result = handler.handleDragEnd(makeDragEvent(), mockMappingTree, mockOnUpdate);
      expect(result).toEqual({ success: false });
      expect(mockValidateMappingPair).not.toHaveBeenCalled();
    });

    it('should return { success: false } when toNode is undefined (over is null)', () => {
      const fromNode = { isSource: true } as unknown as NodeData;
      const result = handler.handleDragEnd(makeDragEvent(fromNode), mockMappingTree, mockOnUpdate);
      expect(result).toEqual({ success: false });
      expect(mockValidateMappingPair).not.toHaveBeenCalled();
    });

    it('should return { success: false, errorMessage } when validation is invalid with a message', () => {
      const fromNode = { isSource: true } as unknown as NodeData;
      const toNode = { isSource: false } as unknown as NodeData;
      mockValidateMappingPair.mockReturnValue({ isValid: false, errorMessage: 'err' });
      const result = handler.handleDragEnd(makeDragEvent(fromNode, toNode), mockMappingTree, mockOnUpdate);
      expect(result).toEqual({ success: false, errorMessage: 'err' });
      expect(mockEngageMapping).not.toHaveBeenCalled();
    });

    it('should return { success: false, errorMessage: undefined } when validation is invalid without message', () => {
      const fromNode = { isSource: true } as unknown as NodeData;
      const toNode = { isSource: false } as unknown as NodeData;
      mockValidateMappingPair.mockReturnValue({ isValid: false });
      const result = handler.handleDragEnd(makeDragEvent(fromNode, toNode), mockMappingTree, mockOnUpdate);
      expect(result).toEqual({ success: false, errorMessage: undefined });
      expect(mockEngageMapping).not.toHaveBeenCalled();
    });

    it('should call engageMapping and onUpdate and return { success: true } when validation passes with nodes', () => {
      const fromNode = { isSource: true } as unknown as NodeData;
      const toNode = { isSource: false } as unknown as NodeData;
      mockValidateMappingPair.mockReturnValue({ isValid: true, sourceNode: fromNode, targetNode: toNode });
      const result = handler.handleDragEnd(makeDragEvent(fromNode, toNode), mockMappingTree, mockOnUpdate);
      expect(mockEngageMapping).toHaveBeenCalledWith(mockMappingTree, fromNode, toNode);
      expect(mockOnUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('handleDragStart', () => {
    it('should return { success: false } when node data is undefined', () => {
      const result = handler.handleDragStart(makeDragEvent() as unknown as DragStartEvent);
      expect(result).toEqual({ success: false });
      expect(mockIsDraggable).not.toHaveBeenCalled();
    });

    it('should return { success: true } when isDraggable returns true', () => {
      const node = { isSource: true } as unknown as NodeData;
      mockIsDraggable.mockReturnValue(true);
      const result = handler.handleDragStart(makeDragEvent(node) as unknown as DragStartEvent);
      expect(result).toEqual({ success: true });
      expect(mockIsDraggable).toHaveBeenCalledWith(node);
    });

    it('should return { success: false } when isDraggable returns false', () => {
      const node = { isSource: true } as unknown as NodeData;
      mockIsDraggable.mockReturnValue(false);
      const result = handler.handleDragStart(makeDragEvent(node) as unknown as DragStartEvent);
      expect(result).toEqual({ success: false });
      expect(mockIsDraggable).toHaveBeenCalledWith(node);
    });
  });
});
