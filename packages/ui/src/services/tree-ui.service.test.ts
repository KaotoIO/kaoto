import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { DocumentTree } from '../models/datamapper/document-tree';
import { DocumentNodeData } from '../models/datamapper/visualization';
import { useDocumentTreeStore } from '../store/document-tree.store';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { TreeParsingService } from './tree-parsing.service';
import { TreeUIService } from './tree-ui.service';
import { XmlSchemaDocument } from './xml-schema-document.model';

describe('TreeUIService', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);

    useDocumentTreeStore.setState({ expansionState: {} });
  });

  describe('createTree', () => {
    it('should create a DocumentTree with the given DocumentNodeData', () => {
      const tree = TreeUIService.createTree(sourceDocNode);

      expect(tree).toBeInstanceOf(DocumentTree);
      expect(tree.root.nodeData).toBe(sourceDocNode);
    });

    it('should parse the tree to INITIAL_PARSE_DEPTH', () => {
      const tree = TreeUIService.createTree(sourceDocNode);

      expect(tree.root.isParsed).toBe(true);
      expect(tree.root.children.length).toBeGreaterThan(0);

      const hasChildrenParsed = tree.root.children.some((child) => child.isParsed);
      expect(hasChildrenParsed).toBe(true);
    });

    it('should set initial expansion state in the store', () => {
      const tree = TreeUIService.createTree(sourceDocNode);

      const store = useDocumentTreeStore.getState();
      const documentId = sourceDocNode.id;
      const expansionState = store.expansionState[documentId];

      expect(expansionState).toBeDefined();
      expect(expansionState[tree.root.path]).toBe(true);
    });

    it('should initialize expansion state for all nodes up to INITIAL_PARSE_DEPTH', () => {
      const tree = TreeUIService.createTree(sourceDocNode);

      const store = useDocumentTreeStore.getState();
      const documentId = sourceDocNode.id;
      const expansionState = store.expansionState[documentId];

      const expandedNodeCount = Object.keys(expansionState).length;
      expect(expandedNodeCount).toBeGreaterThan(1); // At least root and some children

      expect(store.isExpanded(documentId, tree.root.path)).toBe(true);
    });

    it('should store the tree internally and make it accessible via toggleNode', () => {
      const tree = TreeUIService.createTree(sourceDocNode);

      // This is an indirect test - we'll verify the tree is stored by using toggleNode
      const documentId = sourceDocNode.id;
      const firstChildPath = tree.root.children[0]?.path;

      expect(() => TreeUIService.toggleNode(documentId, firstChildPath)).not.toThrow();
    });

    it('should create tree for primitive document', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primitiveDocNode = new DocumentNodeData(primitiveDoc);

      const tree = TreeUIService.createTree(primitiveDocNode);

      expect(tree).toBeInstanceOf(DocumentTree);
      expect(tree.root.isParsed).toBe(false);
      expect(tree.root.children).toHaveLength(0);
    });

    it('should create separate trees for different documents', () => {
      const sourceDocNode1 = new DocumentNodeData(sourceDoc);
      const targetDoc = TestUtil.createTargetOrderDoc();
      const targetDocNode = new DocumentNodeData(targetDoc);

      const tree1 = TreeUIService.createTree(sourceDocNode1);
      const tree2 = TreeUIService.createTree(targetDocNode);

      expect(tree1).not.toBe(tree2);
      expect(tree1.root.nodeData.id).not.toBe(tree2.root.nodeData.id);

      // Verify both have separate expansion states
      const store = useDocumentTreeStore.getState();
      expect(store.expansionState[sourceDocNode1.id]).toBeDefined();
      expect(store.expansionState[targetDocNode.id]).toBeDefined();
    });

    it('should replace existing tree if called with same document ID', () => {
      const tree1 = TreeUIService.createTree(sourceDocNode);
      const tree2 = TreeUIService.createTree(sourceDocNode);

      expect(tree1).not.toBe(tree2);
      expect(tree1).toBeInstanceOf(DocumentTree);
      expect(tree2).toBeInstanceOf(DocumentTree);

      const store = useDocumentTreeStore.getState();
      const documentId = sourceDocNode.id;
      expect(store.expansionState[documentId]).toBeDefined();
    });
  });

  describe('toggleNode', () => {
    let tree: DocumentTree;
    let documentId: string;

    beforeEach(() => {
      tree = TreeUIService.createTree(sourceDocNode);
      documentId = sourceDocNode.id;
    });

    it('should toggle expansion state of a node in the store', () => {
      const store = useDocumentTreeStore.getState();
      const nodePath = tree.root.path;

      const initialState = store.isExpanded(documentId, nodePath);
      TreeUIService.toggleNode(documentId, nodePath);
      const newState = store.isExpanded(documentId, nodePath);

      expect(newState).toBe(!initialState);
    });

    it('should parse unparsed node before toggling', () => {
      const parseTreeNodeSpy = jest.spyOn(TreeParsingService, 'parseTreeNode');

      // Find an unparsed node by navigating the tree
      // Level 1 nodes are parsed (depth 1 < 3)
      const level1Node = tree.root.children[0];
      expect(level1Node).toBeDefined();
      expect(level1Node.isParsed).toBe(true);

      // Find a level 1 node that has children to ensure we can go deeper
      const level1WithChildren = tree.root.children.find((node) => node.isParsed && node.children.length > 0);
      expect(level1WithChildren).toBeDefined();

      // Level 2: Find a parsed node with children
      const level2WithChildren = level1WithChildren!.children.find((node) => node.isParsed && node.children.length > 0);
      expect(level2WithChildren).toBeDefined();

      // Level 3: This node should NOT be parsed (depth 3 >= 3)
      const level3Node = level2WithChildren!.children[0];
      expect(level3Node).toBeDefined();
      expect(level3Node.isParsed).toBe(false);
      expect(level3Node.children.length).toBe(0);

      // Toggle the unparsed node - this should trigger parsing
      TreeUIService.toggleNode(documentId, level3Node.path);

      // Verify parseTreeNode was called with the unparsed node
      expect(parseTreeNodeSpy).toHaveBeenCalledWith(level3Node);

      parseTreeNodeSpy.mockRestore();
    });

    it('should not re-parse already parsed nodes', () => {
      // Get first child which is already parsed (depth 1)
      const firstChild = tree.root.children[0];
      expect(firstChild).toBeDefined();
      expect(firstChild.isParsed).toBe(true);

      const childrenCountBefore = firstChild.children.length;
      expect(childrenCountBefore).toBeGreaterThan(0);

      // Toggle the already-parsed node
      TreeUIService.toggleNode(documentId, firstChild.path);

      // Children count should not change (no re-parsing happens)
      expect(firstChild.children.length).toBe(childrenCountBefore);
    });

    it('should do nothing if document ID is not found', () => {
      const store = useDocumentTreeStore.getState();
      const nonExistentId = 'non-existent-id';
      const initialExpansionState = { ...store.expansionState };

      TreeUIService.toggleNode(nonExistentId, tree.root.path);

      expect(store.expansionState).toEqual(initialExpansionState);
      expect(store.expansionState[nonExistentId]).toBeUndefined();
    });

    it('should do nothing if node path is not found', () => {
      const store = useDocumentTreeStore.getState();
      const nonExistentPath = 'sourceBody:nonexistent://path';
      const initialExpansionState = { ...store.expansionState[documentId] };

      TreeUIService.toggleNode(documentId, nonExistentPath);

      expect(store.expansionState[documentId]).toEqual(initialExpansionState);
      expect(store.isExpanded(documentId, nonExistentPath)).toBe(false);
    });

    it('should toggle node multiple times correctly', () => {
      const store = useDocumentTreeStore.getState();
      const nodePath = tree.root.path;

      const initialState = store.isExpanded(documentId, nodePath);

      TreeUIService.toggleNode(documentId, nodePath);
      expect(store.isExpanded(documentId, nodePath)).toBe(!initialState);

      TreeUIService.toggleNode(documentId, nodePath);
      expect(store.isExpanded(documentId, nodePath)).toBe(initialState);

      TreeUIService.toggleNode(documentId, nodePath);
      expect(store.isExpanded(documentId, nodePath)).toBe(!initialState);
    });

    it('should handle toggling child nodes', () => {
      const store = useDocumentTreeStore.getState();
      const firstChild = tree.root.children[0];

      // Tree always has children based on our test fixture
      expect(firstChild).toBeDefined();

      const initialState = store.isExpanded(documentId, firstChild.path);

      TreeUIService.toggleNode(documentId, firstChild.path);
      const newState = store.isExpanded(documentId, firstChild.path);

      expect(newState).toBe(!initialState);
    });

    it('should handle deeply nested nodes', () => {
      // Navigate to a node at depth 2 (two levels down from root)
      const level1Node = tree.root.children[0];
      expect(level1Node).toBeDefined();

      const level2Node = level1Node.children[0];
      expect(level2Node).toBeDefined();

      const store = useDocumentTreeStore.getState();
      const initialState = store.isExpanded(documentId, level2Node.path);

      TreeUIService.toggleNode(documentId, level2Node.path);

      expect(store.isExpanded(documentId, level2Node.path)).toBe(!initialState);
    });
  });

  it('should create tree and toggle nodes in sequence', () => {
    const tree = TreeUIService.createTree(sourceDocNode);
    const documentId = sourceDocNode.id;
    const store = useDocumentTreeStore.getState();

    // Initial state: root should be expanded
    expect(store.isExpanded(documentId, tree.root.path)).toBe(true);

    // Toggle root
    TreeUIService.toggleNode(documentId, tree.root.path);
    expect(store.isExpanded(documentId, tree.root.path)).toBe(false);

    // Toggle root again
    TreeUIService.toggleNode(documentId, tree.root.path);
    expect(store.isExpanded(documentId, tree.root.path)).toBe(true);

    // Toggle a child - we know tree has children from our fixture
    expect(tree.root.children.length).toBeGreaterThan(0);
    const firstChildPath = tree.root.children[0].path;
    const initialChildState = store.isExpanded(documentId, firstChildPath);

    TreeUIService.toggleNode(documentId, firstChildPath);
    expect(store.isExpanded(documentId, firstChildPath)).toBe(!initialChildState);
  });

  it('should maintain separate state for multiple documents', () => {
    const sourceTree = TreeUIService.createTree(sourceDocNode);
    const targetDoc = TestUtil.createTargetOrderDoc();
    const targetDocNode = new DocumentNodeData(targetDoc);
    const targetTree = TreeUIService.createTree(targetDocNode);

    const sourceDocId = sourceDocNode.id;
    const targetDocId = targetDocNode.id;
    const store = useDocumentTreeStore.getState();

    // Both roots should be expanded initially
    expect(store.isExpanded(sourceDocId, sourceTree.root.path)).toBe(true);
    expect(store.isExpanded(targetDocId, targetTree.root.path)).toBe(true);

    // Toggle source root
    TreeUIService.toggleNode(sourceDocId, sourceTree.root.path);
    expect(store.isExpanded(sourceDocId, sourceTree.root.path)).toBe(false);
    expect(store.isExpanded(targetDocId, targetTree.root.path)).toBe(true);

    // Toggle target root
    TreeUIService.toggleNode(targetDocId, targetTree.root.path);
    expect(store.isExpanded(sourceDocId, sourceTree.root.path)).toBe(false);
    expect(store.isExpanded(targetDocId, targetTree.root.path)).toBe(false);
  });

  it('should handle creating tree, toggling, and verifying expansion state', () => {
    expect.assertions(6);
    TreeUIService.createTree(sourceDocNode);
    const documentId = sourceDocNode.id;
    const store = useDocumentTreeStore.getState();

    // Get initial expansion state
    const initialExpansionState = { ...store.expansionState[documentId] };

    const initialKeys = Object.keys(initialExpansionState);
    expect(initialKeys.length).toEqual(14);

    const expandedPaths = Object.entries(initialExpansionState).reduce((acc, [path, isExpanded]) => {
      if (isExpanded) acc.push(path);
      return acc;
    }, [] as string[]);
    expect(expandedPaths.length).toEqual(4);

    // Toggle all initially expanded nodes
    for (const nodePath of expandedPaths) {
      TreeUIService.toggleNode(documentId, nodePath);
    }

    // All initially expanded nodes should now be collapsed
    for (const nodePath of expandedPaths) {
      expect(store.isExpanded(documentId, nodePath)).toBe(false);
    }
  });

  it('should work with both XML source and target documents', () => {
    const sourceTree = TreeUIService.createTree(sourceDocNode);
    const targetDoc = TestUtil.createTargetOrderDoc();
    const targetDocNode = new DocumentNodeData(targetDoc);
    const targetTree = TreeUIService.createTree(targetDocNode);

    expect(sourceTree.root.isParsed).toBe(true);
    expect(targetTree.root.isParsed).toBe(true);
    expect(sourceTree.root.children.length).toBeGreaterThan(0);
    expect(targetTree.root.children.length).toBeGreaterThan(0);

    const store = useDocumentTreeStore.getState();
    expect(store.expansionState[sourceDocNode.id]).toBeDefined();
    expect(store.expansionState[targetDocNode.id]).toBeDefined();
  });

  describe('edge cases', () => {
    it('should handle toggling root node', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;
      const store = useDocumentTreeStore.getState();

      const rootPath = tree.root.path;
      const initialState = store.isExpanded(documentId, rootPath);

      TreeUIService.toggleNode(documentId, rootPath);

      expect(store.isExpanded(documentId, rootPath)).toBe(!initialState);
    });

    it('should handle empty document ID', () => {
      const store = useDocumentTreeStore.getState();
      const initialExpansionState = { ...store.expansionState };

      TreeUIService.toggleNode('', 'some-path');

      // Expansion state should remain unchanged
      expect(store.expansionState).toEqual(initialExpansionState);
    });

    it('should handle empty node path', () => {
      TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;
      const store = useDocumentTreeStore.getState();
      const initialExpansionState = { ...store.expansionState[documentId] };

      TreeUIService.toggleNode(documentId, '');

      // Expansion state for this document should remain unchanged
      expect(store.expansionState[documentId]).toEqual(initialExpansionState);
    });

    it('should handle primitive document tree', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primitiveDocNode = new DocumentNodeData(primitiveDoc);
      const tree = TreeUIService.createTree(primitiveDocNode);

      expect(tree.root.children).toHaveLength(0);
      expect(tree.root.isParsed).toBe(false);

      const store = useDocumentTreeStore.getState();
      const documentId = primitiveDocNode.id;

      // Expansion state should still be set even for primitive documents
      expect(store.expansionState[documentId]).toBeDefined();
    });

    it('should handle rapid consecutive toggles', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;
      const nodePath = tree.root.path;
      const store = useDocumentTreeStore.getState();

      const initialState = store.isExpanded(documentId, nodePath);

      // Rapid toggles
      TreeUIService.toggleNode(documentId, nodePath);
      TreeUIService.toggleNode(documentId, nodePath);
      TreeUIService.toggleNode(documentId, nodePath);
      TreeUIService.toggleNode(documentId, nodePath);
      TreeUIService.toggleNode(documentId, nodePath);

      // After odd number of toggles, state should be opposite of initial
      expect(store.isExpanded(documentId, nodePath)).toBe(!initialState);
    });
  });
});
