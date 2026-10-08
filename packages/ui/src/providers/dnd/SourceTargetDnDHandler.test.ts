import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Mock, MockInstance } from 'vitest';

import { MappingTree } from '../../models/datamapper/mapping';
import { NodeData, SourceNodeDataType, TargetNodeData } from '../../models/datamapper/visualization';
import { MappingActionService } from '../../services/visualization/mapping-action.service';
import { MappingValidationService } from '../../services/visualization/mapping-validation.service';
import { SourceTargetDnDHandler } from './SourceTargetDnDHandler';

const makeDragEvent = (fromNode?: NodeData, toNode?: NodeData) =>
  ({
    active: { id: 'a', data: { current: fromNode } },
    over: toNode ? { id: 'b', data: { current: toNode } } : null,
  }) as unknown as DragEndEvent;

describe('SourceTargetDnDHandler', () => {
  let handler: SourceTargetDnDHandler;
  let mockMappingTree: MappingTree;
  let mockOnUpdate: Mock<(options?: { structural?: boolean }) => void>;
  let mockValidateMappingPair: MockInstance<typeof MappingValidationService.validateMappingPair>;
  let mockEngageMapping: MockInstance<typeof MappingActionService.engageMapping>;
  let mockIsDraggable: MockInstance<typeof MappingValidationService.isDraggable>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new SourceTargetDnDHandler();
    mockMappingTree = {} as MappingTree;
    mockOnUpdate = vi.fn();
    mockValidateMappingPair = vi
      .spyOn(MappingValidationService, 'validateMappingPair')
      .mockReturnValue({ isValid: false });
    mockEngageMapping = vi.spyOn(MappingActionService, 'engageMapping').mockReturnValue(false);
    mockIsDraggable = vi.spyOn(MappingValidationService, 'isDraggable').mockReturnValue(false);
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

    it('should call engageMapping and onUpdate({ structural: true }) when engageMapping reports a structural change', () => {
      const fromNode = { isSource: true } as unknown as SourceNodeDataType;
      const toNode = { isSource: false } as unknown as TargetNodeData;
      mockValidateMappingPair.mockReturnValue({ isValid: true, sourceNode: fromNode, targetNode: toNode });
      mockEngageMapping.mockReturnValue(true);
      const result = handler.handleDragEnd(makeDragEvent(fromNode, toNode), mockMappingTree, mockOnUpdate);
      expect(mockEngageMapping).toHaveBeenCalledWith(mockMappingTree, fromNode, toNode);
      expect(mockOnUpdate).toHaveBeenCalledWith({ structural: true });
      expect(result).toEqual({ success: true });
    });

    it('should call onUpdate({ structural: false }) when engageMapping reports a value-only update', () => {
      const fromNode = { isSource: true } as unknown as SourceNodeDataType;
      const toNode = { isSource: false } as unknown as TargetNodeData;
      mockValidateMappingPair.mockReturnValue({ isValid: true, sourceNode: fromNode, targetNode: toNode });
      mockEngageMapping.mockReturnValue(false);
      const result = handler.handleDragEnd(makeDragEvent(fromNode, toNode), mockMappingTree, mockOnUpdate);
      expect(mockOnUpdate).toHaveBeenCalledWith({ structural: false });
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
