import { renderHook } from '@testing-library/react';
import hotkeys from 'hotkeys-js';
import type { Mock } from 'vitest';

import { IDocument } from '../models/datamapper';
import { MappingActionKind } from '../models/datamapper/mapping-action';
import { DocumentNodeData, TargetDocumentNodeData } from '../models/datamapper/visualization';
import { MappingActionService } from '../services/visualization/mapping-action.service';
import { MappingActionRegistryService } from '../services/visualization/mapping-action-registry.service';
import { TreeUIService } from '../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../store/document-tree.store';
import { useDataMapper } from './useDataMapper';
import { useDataMapperDeleteHotkey } from './useDataMapperDeleteHotkey.hook';

// Mock dependencies
vi.mock('hotkeys-js');
vi.mock('./useDataMapper');
vi.mock('../services/visualization/mapping-action-registry.service');
vi.mock('../services/visualization/mapping-action.service');
vi.mock('../services/visualization/tree-ui.service');

describe('useDataMapperDeleteHotkey', () => {
  let mockOnUpdate: Mock;
  let mockClearSelection: Mock;
  let mockHotkeys: MockedFunction<typeof hotkeys>;
  let mockHotkeysUnbind: Mock;
  let mockUseDataMapper: MockedFunction<typeof useDataMapper>;
  let mockGetAllowedActions: Mock;
  let mockDeleteMappingItem: Mock;
  let mockGetTree: Mock;
  let mockFindNodeByPath: Mock;
  let mockTargetBodyDocument: { id: string; documentType: string; documentId: string };
  let mockTreeNode: { nodeData: TargetDocumentNodeData };
  let mockTargetDocumentNodeData: TargetDocumentNodeData;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup basic mocks
    mockOnUpdate = vi.fn();
    mockClearSelection = vi.fn();
    mockHotkeysUnbind = vi.fn();
    mockGetAllowedActions = vi.fn();
    mockDeleteMappingItem = vi.fn();
    mockGetTree = vi.fn();
    mockFindNodeByPath = vi.fn();

    // Mock hotkeys
    mockHotkeys = hotkeys as MockedFunction<typeof hotkeys>;
    mockHotkeys.unbind = mockHotkeysUnbind;

    // Mock useDataMapper
    mockTargetBodyDocument = { id: 'target-doc', documentType: 'targetBody', documentId: 'Body' };
    mockUseDataMapper = useDataMapper as MockedFunction<typeof useDataMapper>;
    mockUseDataMapper.mockReturnValue({
      targetBodyDocument: mockTargetBodyDocument,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Mock MappingActionService
    (MappingActionRegistryService.getAllowedActions as Mock) = mockGetAllowedActions;
    (MappingActionService.deleteMappingItem as Mock) = mockDeleteMappingItem;

    // Mock TreeUIService
    (TreeUIService.getTree as Mock) = mockGetTree;

    // Setup mock node data
    mockTargetDocumentNodeData = { id: 'test-node' } as TargetDocumentNodeData;
    mockTreeNode = {
      nodeData: mockTargetDocumentNodeData,
    };

    mockFindNodeByPath = vi.fn();
    mockGetTree.mockReturnValue({
      findNodeByPath: mockFindNodeByPath,
    });

    // Setup default store state
    useDocumentTreeStore.setState({
      selectedNodePath: null,
      selectedNodeIsSource: false,
      clearSelection: mockClearSelection,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful deletion', () => {
    beforeEach(() => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'test-path',
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      });

      mockFindNodeByPath.mockReturnValue(mockTreeNode);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);
    });

    it('should delete mapping when valid target node is selected and Delete is allowed', () => {
      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).toHaveBeenCalledWith(mockTargetDocumentNodeData);
    });

    it('should clear selection after deletion', () => {
      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('should call onUpdate callback after deletion', () => {
      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

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
      });

      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

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
      });

      mockFindNodeByPath.mockReturnValue(mockTreeNode);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.If, MappingActionKind.Choose]);

      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

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
      });

      mockFindNodeByPath.mockReturnValue(null);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);

      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

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
      });

      mockFindNodeByPath.mockReturnValue(undefined);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);

      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

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
      });

      mockFindNodeByPath.mockReturnValue(mockTreeNode);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);

      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).not.toHaveBeenCalled();
      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe('tree lookup', () => {
    it('should not call getTree during render', () => {
      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      expect(mockGetTree).not.toHaveBeenCalled();
    });

    it('should call getTree when handling keypress', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'test-path',
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      });

      mockFindNodeByPath.mockReturnValue(mockTreeNode);
      mockGetAllowedActions.mockReturnValue([MappingActionKind.Delete]);

      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyCallback(mockEvent);

      expect(mockGetTree).toHaveBeenCalledWith(DocumentNodeData.getId(mockTargetBodyDocument as unknown as IDocument));
    });

    it('should not delete when getTree returns undefined', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: 'test-path',
        selectedNodeIsSource: false,
        clearSelection: mockClearSelection,
      });

      mockGetTree.mockReturnValue(undefined);

      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      const hotkeyCallback = mockHotkeys.mock.calls[0][1] as (event: KeyboardEvent) => void;
      const mockEvent = { preventDefault: vi.fn() } as unknown as KeyboardEvent;
      hotkeyCallback(mockEvent);

      expect(mockDeleteMappingItem).not.toHaveBeenCalled();
      expect(mockClearSelection).not.toHaveBeenCalled();
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe('hotkey registration', () => {
    it('should register hotkeys with delete and backspace keys', () => {
      renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      expect(mockHotkeys).toHaveBeenCalled();
      const keyString = mockHotkeys.mock.calls[0][0] as string;

      expect(keyString.toLowerCase()).toContain('delete');
      expect(keyString.toLowerCase()).toContain('backspace');
    });
  });

  describe('cleanup and unmount', () => {
    it('should unbind hotkeys on unmount', () => {
      const { unmount } = renderHook(() => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      });

      unmount();

      expect(mockHotkeysUnbind).toHaveBeenCalled();
    });
  });
});
