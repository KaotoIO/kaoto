import { renderHook } from '@testing-library/react';
import hotkeys, { HotkeysEvent, KeyHandler } from 'hotkeys-js';
import type { MockInstance } from 'vitest';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../models/datamapper/document';
import { DocumentTree } from '../models/datamapper/document-tree';
import { DocumentTreeNode } from '../models/datamapper/document-tree-node';
import { MappingTree } from '../models/datamapper/mapping';
import { MappingActionKind } from '../models/datamapper/mapping-action';
import { DocumentNodeData, TargetDocumentNodeData } from '../models/datamapper/visualization';
import { MappingActionService } from '../services/visualization/mapping-action.service';
import { MappingActionRegistryService } from '../services/visualization/mapping-action-registry.service';
import { TreeParsingService } from '../services/visualization/tree-parsing.service';
import { TreeUIService } from '../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../store/document-tree.store';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { createDataMapperContext, createDataMapperContextWrapper } from '../stubs/datamapper/data-mapper-context';
import { useDataMapperDeleteHotkey } from './useDataMapperDeleteHotkey.hook';

describe('useDataMapperDeleteHotkey', () => {
  const mockOnUpdate = vi.fn();
  let targetBodyDocument: ReturnType<typeof TestUtil.createTargetOrderDoc>;
  let targetBodyTree: DocumentTree;
  let selectedTreeNode: DocumentTreeNode;
  let wrapper: ReturnType<typeof createDataMapperContextWrapper>;
  let getTreeSpy: MockInstance<typeof TreeUIService.getTree>;
  let getAllowedActionsSpy: MockInstance<typeof MappingActionRegistryService.getAllowedActions>;
  let deleteMappingItemSpy: MockInstance<typeof MappingActionService.deleteMappingItem>;

  /** Invokes the handler registered with the (globally mocked) `hotkeys`, as if Delete was pressed. */
  const pressDelete = () => {
    const handler = vi.mocked(hotkeys).mock.calls[0].find((arg): arg is KeyHandler => typeof arg === 'function');
    if (!handler) throw new Error('No hotkey handler registered');
    handler(new KeyboardEvent('keydown', { key: 'Delete' }), { key: 'delete' } as HotkeysEvent);
  };

  const renderDeleteHotkey = () =>
    renderHook(
      () => {
        useDataMapperDeleteHotkey(mockOnUpdate);
      },
      { wrapper },
    );

  beforeEach(() => {
    vi.clearAllMocks();

    targetBodyDocument = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    targetBodyTree = new DocumentTree(new TargetDocumentNodeData(targetBodyDocument, mappingTree));
    TreeParsingService.parseTree(targetBodyTree);
    selectedTreeNode = targetBodyTree.contentRoots[0];

    wrapper = createDataMapperContextWrapper(createDataMapperContext({ targetBodyDocument, mappingTree }));

    getTreeSpy = vi.spyOn(TreeUIService, 'getTree').mockReturnValue(targetBodyTree);
    getAllowedActionsSpy = vi.spyOn(MappingActionRegistryService, 'getAllowedActions');
    deleteMappingItemSpy = vi.spyOn(MappingActionService, 'deleteMappingItem').mockImplementation(() => {});

    // Setup default store state
    useDocumentTreeStore.setState({
      selectedNodePath: null,
      selectedNodeIsSource: false,
    });
  });

  const expectNothingDeleted = (selectedNodePath: string | null) => {
    expect(deleteMappingItemSpy).not.toHaveBeenCalled();
    expect(useDocumentTreeStore.getState().selectedNodePath).toBe(selectedNodePath);
    expect(mockOnUpdate).not.toHaveBeenCalled();
  };

  describe('successful deletion', () => {
    beforeEach(() => {
      useDocumentTreeStore.setState({
        selectedNodePath: selectedTreeNode.path,
        selectedNodeIsSource: false,
      });

      getAllowedActionsSpy.mockReturnValue([MappingActionKind.Delete]);
    });

    it('should delete mapping when valid target node is selected and Delete is allowed', () => {
      renderDeleteHotkey();

      pressDelete();

      expect(deleteMappingItemSpy).toHaveBeenCalledWith(selectedTreeNode.nodeData);
    });

    it('should clear selection after deletion', () => {
      renderDeleteHotkey();

      pressDelete();

      expect(useDocumentTreeStore.getState().selectedNodePath).toBeNull();
    });

    it('should call onUpdate callback after deletion', () => {
      renderDeleteHotkey();

      pressDelete();

      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  describe('deletion blocked scenarios', () => {
    it('should not delete when no node is selected', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: null,
        selectedNodeIsSource: false,
      });

      renderDeleteHotkey();

      pressDelete();

      expectNothingDeleted(null);
    });

    it('should not delete when Delete action is not allowed', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: selectedTreeNode.path,
        selectedNodeIsSource: false,
      });

      getAllowedActionsSpy.mockReturnValue([MappingActionKind.If, MappingActionKind.Choose]);

      renderDeleteHotkey();

      pressDelete();

      expectNothingDeleted(selectedTreeNode.path);
    });

    it('should not delete when findNodeByPath returns null', () => {
      // The selected path is not part of the target tree, so the real lookup finds nothing
      const unknownPath = `${selectedTreeNode.path}/not-in-the-tree`;
      useDocumentTreeStore.setState({
        selectedNodePath: unknownPath,
        selectedNodeIsSource: false,
      });

      getAllowedActionsSpy.mockReturnValue([MappingActionKind.Delete]);

      renderDeleteHotkey();

      pressDelete();

      expectNothingDeleted(unknownPath);
    });

    it('should not delete when findNodeByPath returns undefined', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: selectedTreeNode.path,
        selectedNodeIsSource: false,
      });

      vi.spyOn(targetBodyTree, 'findNodeByPath').mockReturnValue(undefined);
      getAllowedActionsSpy.mockReturnValue([MappingActionKind.Delete]);

      renderDeleteHotkey();

      pressDelete();

      expectNothingDeleted(selectedTreeNode.path);
    });

    it('should not delete when selected node is a source node', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: selectedTreeNode.path,
        selectedNodeIsSource: true,
      });

      getAllowedActionsSpy.mockReturnValue([MappingActionKind.Delete]);

      renderDeleteHotkey();

      pressDelete();

      expectNothingDeleted(selectedTreeNode.path);
    });
  });

  describe('tree lookup', () => {
    it('should not call getTree during render', () => {
      renderDeleteHotkey();

      expect(getTreeSpy).not.toHaveBeenCalled();
    });

    it('should call getTree when handling keypress', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: selectedTreeNode.path,
        selectedNodeIsSource: false,
      });

      getAllowedActionsSpy.mockReturnValue([MappingActionKind.Delete]);

      renderDeleteHotkey();

      pressDelete();

      expect(getTreeSpy).toHaveBeenCalledWith(DocumentNodeData.getId(targetBodyDocument));
    });

    it('should not delete when getTree returns undefined', () => {
      useDocumentTreeStore.setState({
        selectedNodePath: selectedTreeNode.path,
        selectedNodeIsSource: false,
      });

      getTreeSpy.mockReturnValue(undefined);

      renderDeleteHotkey();

      pressDelete();

      expectNothingDeleted(selectedTreeNode.path);
    });
  });

  describe('hotkey registration', () => {
    it('should register hotkeys with delete and backspace keys', () => {
      renderDeleteHotkey();

      expect(hotkeys).toHaveBeenCalled();
      const keyString = vi.mocked(hotkeys).mock.calls[0][0];

      expect(keyString.toLowerCase()).toContain('delete');
      expect(keyString.toLowerCase()).toContain('backspace');
    });
  });

  describe('cleanup and unmount', () => {
    it('should unbind hotkeys on unmount', () => {
      const { unmount } = renderDeleteHotkey();

      unmount();

      expect(hotkeys.unbind).toHaveBeenCalled();
    });
  });
});
