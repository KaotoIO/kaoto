import { DragEndEvent } from '@dnd-kit/core';

import { DocumentType, IField } from '../../models/datamapper/document';
import { ExpressionItem, IFunctionDefinition, MappingTree } from '../../models/datamapper/mapping';
import { NodePath } from '../../models/datamapper/nodepath';
import { Types } from '../../models/datamapper/types';
import { EditorNodeData, FieldNodeData, FunctionNodeData, NodeData } from '../../models/datamapper/visualization';
import { MappingService } from '../../services/mapping.service';
import { ExpressionEditorDnDHandler } from './ExpressionEditorDnDHandler';

jest.mock('../../services/mapping.service', () => ({
  MappingService: {
    mapToCondition: jest.fn(),
    wrapWithFunction: jest.fn(),
  },
}));

const makeDragEvent = (fromNode?: NodeData, toNode?: NodeData) =>
  ({
    active: { id: 'a', data: { current: fromNode } },
    over: toNode ? { id: 'b', data: { current: toNode } } : null,
  }) as unknown as DragEndEvent;

describe('ExpressionEditorDnDHandler', () => {
  let handler: ExpressionEditorDnDHandler;
  let mockMappingTree: MappingTree;
  let mockOnUpdate: jest.Mock;
  let mockMapToCondition: jest.Mock;
  let mockWrapWithFunction: jest.Mock;

  const mockParentNode = {
    path: NodePath.fromDocument(DocumentType.SOURCE_BODY, 'Body'),
    isSource: true,
    isPrimitive: false,
  } as unknown as NodeData;

  const mockField = {
    displayName: 'testField',
    id: 'testField',
    type: Types.String,
  } as unknown as IField;

  const mockFunctionDef = {
    name: 'fn',
    displayName: 'fn',
    description: '',
    returnType: Types.String,
    arguments: [],
  } as unknown as IFunctionDefinition;

  const mockMapping = {} as unknown as ExpressionItem;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ExpressionEditorDnDHandler();
    mockMappingTree = {} as MappingTree;
    mockOnUpdate = jest.fn();
    mockMapToCondition = MappingService.mapToCondition as jest.Mock;
    mockWrapWithFunction = MappingService.wrapWithFunction as jest.Mock;
  });

  describe('handleDragEnd', () => {
    it('should return { success: false } when fromNode is undefined', () => {
      const editorNode = new EditorNodeData(mockMapping);
      const result = handler.handleDragEnd(makeDragEvent(undefined, editorNode), mockMappingTree, mockOnUpdate);
      expect(result).toEqual({ success: false });
      expect(mockMapToCondition).not.toHaveBeenCalled();
    });

    it('should return { success: false } when fromNode is neither FieldNodeData nor FunctionNodeData', () => {
      const genericNode = { title: 'generic', id: 'g', isSource: true, isPrimitive: false } as unknown as NodeData;
      const editorNode = new EditorNodeData(mockMapping);
      const result = handler.handleDragEnd(makeDragEvent(genericNode, editorNode), mockMappingTree, mockOnUpdate);
      expect(result).toEqual({ success: false });
      expect(mockMapToCondition).not.toHaveBeenCalled();
    });

    it('should return { success: false } when toNode is not EditorNodeData', () => {
      const fieldNode = new FieldNodeData(mockParentNode, mockField);
      const nonEditorNode = { title: 'other', id: 'o', isSource: false, isPrimitive: false } as unknown as NodeData;
      const result = handler.handleDragEnd(makeDragEvent(fieldNode, nonEditorNode), mockMappingTree, mockOnUpdate);
      expect(result).toEqual({ success: false });
      expect(mockMapToCondition).not.toHaveBeenCalled();
    });

    it('should call MappingService.mapToCondition and return { success: true } when fromNode is FieldNodeData', () => {
      const fieldNode = new FieldNodeData(mockParentNode, mockField);
      const editorNode = new EditorNodeData(mockMapping);
      const result = handler.handleDragEnd(makeDragEvent(fieldNode, editorNode), mockMappingTree, mockOnUpdate);
      expect(mockMapToCondition).toHaveBeenCalledWith(mockMapping, mockField);
      expect(mockOnUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should call MappingService.wrapWithFunction and return { success: true } when fromNode is FunctionNodeData', () => {
      const funcNode = new FunctionNodeData(mockFunctionDef);
      const editorNode = new EditorNodeData(mockMapping);
      const result = handler.handleDragEnd(makeDragEvent(funcNode, editorNode), mockMappingTree, mockOnUpdate);
      expect(mockWrapWithFunction).toHaveBeenCalledWith(mockMapping, mockFunctionDef);
      expect(mockOnUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});
