import { renderHook } from '@testing-library/react';
import hotkeys from 'hotkeys-js';

import { DocumentTree } from '../models/datamapper/document-tree';
import { MappingActionKind } from '../models/datamapper/mapping-action';
import { TargetDocumentNodeData } from '../models/datamapper/visualization';
import { MappingActionService } from '../services/visualization/mapping-action.service';
import { TreeUIService } from '../services/visualization/tree-ui.service';
import { DocumentTreeState, useDocumentTreeStore } from '../store/document-tree.store';
import { useDataMapper } from './useDataMapper';
import { useDataMapperDeleteHotkey } from './useDataMapperDeleteHotkey.hook';

// Mock dependencies
jest.mock('hotkeys-js');
jest.mock('./useDataMapper');
jest.mock('../services/visualization/mapping-action.service');
jest.mock('../services/visualization/tree-ui.service');

describe('useDataMapperDeleteHotkey', () => {
  let mockOnUpdate: jest.Mock;
  let mockClearSelection: jest.Mock;
  let mockHotkeys: jest.MockedFunction<typeof hotkeys>;
  let mockHotkeysUnbind: jest.Mock;
  let mockUseDataMapper: jest.MockedFunction<typeof useDataMapper>;
  let mockGetAllowedActions: jest.Mock;
  let mockDeleteMappingItem: jest.Mock;
  let mockCreateTree: jest.Mock;
  let mockFindNodeByPath: jest.Mock;
  let mockTargetBodyDocument: { id: string };
  let mockMappingTree: { mappings: unknown[] };
  let mockTreeNode: { nodeData: TargetDocumentNodeData };
  let mockTargetDocumentNodeData: TargetDocumentNodeData;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup basic mocks
    mockOnUpdate = jest.fn();
    mockClearSelection = jest.fn();
    mockHotkeysUnbind = jest.fn();
    mockGetAllowedActions = jest.fn();
    mockDeleteMappingItem = jest.fn();
    mockCreateTree = jest.fn();
    mockFindNodeByPath = jest.fn();

    // Mock hotkeys
    mockHotkeys = hotkeys as jest.MockedFunction<typeof hotkeys>;
    mockHotkeys.unbind = mockHotkeysUnbind;

    // Mock useDataMapper
    mockTargetBodyDocument = { id: 'target-doc' };
    mockMappingTree = { mappings: [] };
    mockUseDataMapper = useDataMapper as jest.MockedFunction<typeof useDataMapper>;
    mockUseDataMapper.mockReturnValue({
      targetBodyDocument: mockTargetBodyDocument,
      mappingTree: mockMappingTree,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Mock MappingActionService
    (MappingActionService.getAllowedActions as jest.Mock) = mockGetAllowedActions;
    (MappingActionService.deleteMappingItem as jest.Mock) = mockDeleteMappingItem;

    // Mock TreeUIService
    (TreeUIService.createTree as jest.Mock) = mockCreateTree;

    // Setup mock node data
    mockTargetDocumentNodeData = { id: 'test-node' } as TargetDocumentNodeData;
    mockTreeNode = {
      nodeData: mockTargetDocumentNodeData,
    };

    mockFindNodeByPath = jest.fn();
    mockCreateTree.mockReturnValue({
      findNodeByPath: mockFindNodeByPath,
    } as unknown as DocumentTree);

    // Setup default store state
    useDocumentTreeStore.setState({
      selectedNodePath: null,
      selectedNodeIsSource: false,
      clearSelection: mockClearSelection,
    } as Partial<DocumentTreeState>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful deletion', () => {
    beforeEach(() => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'test-path',
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      } as Partial<DocumentTreeState>);

      mockFindNodeByPath.mockReturnValue(mockTreeNode);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);
    });

    it('should delete mapping when valid target node is selected and Delete is allowed', () => {
      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).toHaveBeenCalledWith(mockTargetDocumentNodeData);
    });

    it('should clear selection after deletion', () => {
      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('should call onUpdate callback after deletion', () => {
      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  describe('deletion blocked scenarios', () => {
    it('should not delete when no node is selected', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: null,
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      } as Partial<DocumentTreeState>);

      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).not.toHaveBeenCalled();
      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should not delete when Delete action is not allowed', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'test-path',
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      } as Partial<DocumentTreeState>);

      mockFindNodeByPath.mockReturnValue(mockTreeNode);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.If, MappingActionKind.Choose]);

      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).not.toHaveBeenCalled();
      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should not delete when findNodeByPath returns null', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'test-path',
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      } as Partial<DocumentTreeState>);

      mockFindNodeByPath.mockReturnValue(null);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);

      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).not.toHaveBeenCalled();
      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should not delete when findNodeByPath returns undefined', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'test-path',
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      } as Partial<DocumentTreeState>);

      mockFindNodeByPath.mockReturnValue(undefined);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);

      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).not.toHaveBeenCalled();
      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should not delete when selected node is a source node', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'source-path',
        selectedNodeIsSource: true,
        clearSelection: mockClearSelection,
      } as Partial<DocumentTreeState>);

      mockFindNodeByPath.mockReturnValue(mockTreeNode);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);

      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: jest.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).not.toHaveBeenCalled();
      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });
  describe('tree creation and memoization', () => {
    it('should create TargetDocumentNodeData with correct parameters', () => {
      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      // The hook creates a TargetDocumentNodeData internally
      // We can verify TreeUIService.createTree was called
      expect(mockCreateTree).toHaveBeenCalled();
    });

    it('should recreate tree when targetBodyDocument changes', () => {
      const { rerender } = renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const callCountBefore = mockCreateTree.mock.calls.length;

      // Change targetBodyDocument
      mockUseDataMapper.mockReturnValue({
        targetBodyDocument: { id: 'new-target-doc' },
        mappingTree: mockMappingTree,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      rerender();

      expect(mockCreateTree.mock.calls.length).toBeGreaterThan(callCountBefore);
    });

    it('should recreate tree when mappingTree changes', () => {
      const { rerender } = renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      const callCountBefore = mockCreateTree.mock.calls.length;

      // Change mappingTree
      mockUseDataMapper.mockReturnValue({
        targetBodyDocument: mockTargetBodyDocument,
        mappingTree: { mappings: [{ id: 'new-mapping' }] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      rerender();

      expect(mockCreateTree.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  describe('hotkey registration', () => {
    it('should register hotkeys with delete and backspace keys', () => {
      renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      expect(mockHotkeys).toHaveBeenCalled();
      const keyString = mockHotkeys.mock.calls[0][0] as string;

      expect(keyString.toLowerCase()).toContain('delete');
      expect(keyString.toLowerCase()).toContain('backspace');
    });
  });

  describe('cleanup and unmount', () => {
    it('should unbind hotkeys on unmount', () => {
      const { unmount } = renderHook(() => useDataMapperDeleteHotkey(mockOnUpdate));

      unmount();

      expect(mockHotkeysUnbind).toHaveBeenCalled();
    });
  });
});
