import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { MappingTree } from '../../models/datamapper/mapping';
import {
  DocumentNodeData,
  FieldItemNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import { MappingService } from '../../services/mapping/mapping.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { TreeParsingService } from './tree-parsing.service';
import { TreeUIService } from './tree-ui.service';

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
      expect(expansionState[tree.contentRoots[0].path]).toBe(true);
    });

    it('should initialize expansion state for all nodes up to INITIAL_PARSE_DEPTH', () => {
      const tree = TreeUIService.createTree(sourceDocNode);

      const store = useDocumentTreeStore.getState();
      const documentId = sourceDocNode.id;
      const expansionState = store.expansionState[documentId];

      const expandedNodeCount = Object.keys(expansionState).length;
      expect(expandedNodeCount).toBeGreaterThan(1); // At least content root and some children

      expect(store.isExpanded(documentId, tree.contentRoots[0].path)).toBe(true);
    });

    it('should store the tree internally and make it accessible via toggleNode', () => {
      const tree = TreeUIService.createTree(sourceDocNode);

      // This is an indirect test - we'll verify the tree is stored by using toggleNode
      const documentId = sourceDocNode.id;
      const firstChildPath = tree.root.children[0]?.path;

      expect(() => {
        TreeUIService.toggleNode(documentId, firstChildPath);
      }).not.toThrow();
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

  describe('getTree', () => {
    it('should return undefined when no tree exists for the given ID', () => {
      expect(TreeUIService.getTree('non-existent-id')).toBeUndefined();
    });

    it('should return the cached tree after createTree()', () => {
      TreeUIService.createTree(sourceDocNode);

      const retrieved = TreeUIService.getTree(sourceDocNode.id);

      expect(retrieved).toBeInstanceOf(DocumentTree);
      expect(retrieved!.root.nodeData).toBe(sourceDocNode);
    });

    it('should return different trees for different document IDs', () => {
      TreeUIService.createTree(sourceDocNode);

      const targetDoc = TestUtil.createTargetOrderDoc();
      const targetDocNode = new DocumentNodeData(targetDoc);
      TreeUIService.createTree(targetDocNode);

      const sourceTree = TreeUIService.getTree(sourceDocNode.id);
      const targetTree = TreeUIService.getTree(targetDocNode.id);

      expect(sourceTree).not.toBe(targetTree);
      expect(sourceTree!.root.nodeData.id).not.toBe(targetTree!.root.nodeData.id);
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
      const parseTreeNodeSpy = vi.spyOn(TreeParsingService, 'parseTreeNode');

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
      expect(level3Node.children).toHaveLength(0);

      // Toggle the unparsed node - this should trigger parsing
      TreeUIService.toggleNode(documentId, level3Node.path);

      // Verify parseTreeNode was called with the unparsed node
      expect(parseTreeNodeSpy).toHaveBeenCalledWith(level3Node);

      parseTreeNodeSpy.mockRestore();
    });

    it('should not re-parse already parsed nodes', () => {
      const parseTreeNodeSpy = vi.spyOn(TreeParsingService, 'parseTreeNode');

      // Get first child which is already parsed (depth 1)
      const firstChild = tree.root.children[0];
      expect(firstChild).toBeDefined();
      expect(firstChild.isParsed).toBe(true);

      // Toggle the already-parsed node
      TreeUIService.toggleNode(documentId, firstChild.path);

      // parseTreeNode must not have been called for a node that is already parsed
      expect(parseTreeNodeSpy).not.toHaveBeenCalledWith(firstChild);

      parseTreeNodeSpy.mockRestore();
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

    // Initial state: first content root should be expanded
    const firstContentRoot = tree.contentRoots[0];
    expect(store.isExpanded(documentId, firstContentRoot.path)).toBe(true);

    // Toggle content root
    TreeUIService.toggleNode(documentId, firstContentRoot.path);
    expect(store.isExpanded(documentId, firstContentRoot.path)).toBe(false);

    // Toggle content root again
    TreeUIService.toggleNode(documentId, firstContentRoot.path);
    expect(store.isExpanded(documentId, firstContentRoot.path)).toBe(true);

    // Toggle a child - we know content root has children from our fixture
    expect(firstContentRoot.children.length).toBeGreaterThan(0);
    const firstChildPath = firstContentRoot.children[0].path;
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

    // Both content roots should be expanded initially
    const sourceContentRoot = sourceTree.contentRoots[0];
    const targetContentRoot = targetTree.contentRoots[0];
    expect(store.isExpanded(sourceDocId, sourceContentRoot.path)).toBe(true);
    expect(store.isExpanded(targetDocId, targetContentRoot.path)).toBe(true);

    // Toggle source content root
    TreeUIService.toggleNode(sourceDocId, sourceContentRoot.path);
    expect(store.isExpanded(sourceDocId, sourceContentRoot.path)).toBe(false);
    expect(store.isExpanded(targetDocId, targetContentRoot.path)).toBe(true);

    // Toggle target content root
    TreeUIService.toggleNode(targetDocId, targetContentRoot.path);
    expect(store.isExpanded(sourceDocId, sourceContentRoot.path)).toBe(false);
    expect(store.isExpanded(targetDocId, targetContentRoot.path)).toBe(false);
  });

  it('should handle creating tree, toggling, and verifying expansion state', () => {
    expect.assertions(5);
    TreeUIService.createTree(sourceDocNode);
    const documentId = sourceDocNode.id;
    const store = useDocumentTreeStore.getState();

    // Get initial expansion state
    const initialExpansionState = { ...store.expansionState[documentId] };

    const initialKeys = Object.keys(initialExpansionState);
    expect(initialKeys).toHaveLength(13);

    const expandedPaths = Object.entries(initialExpansionState).reduce((acc, [path, isExpanded]) => {
      if (isExpanded) acc.push(path);
      return acc;
    }, [] as string[]);
    expect(expandedPaths).toHaveLength(3);

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

  describe('expansion state preservation across tree rebuild', () => {
    it('should preserve collapsed state when tree is rebuilt for same document', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;
      const store = useDocumentTreeStore.getState();

      const contentRoot = tree.contentRoots[0];
      expect(store.isExpanded(documentId, contentRoot.path)).toBe(true);

      TreeUIService.toggleNode(documentId, contentRoot.path);
      expect(store.isExpanded(documentId, contentRoot.path)).toBe(false);

      const tree2 = TreeUIService.createTree(sourceDocNode);
      const contentRoot2 = tree2.contentRoots[0];
      expect(store.isExpanded(documentId, contentRoot2.path)).toBe(false);
    });

    it('should preserve expansion state via field identity when node type transitions', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
      const tree1 = TreeUIService.createTree(targetDocNode);
      const documentId = targetDocNode.id;
      const store = useDocumentTreeStore.getState();

      const contentRoot = tree1.contentRoots[0];
      expect(contentRoot.nodeData).toBeInstanceOf(TargetFieldNodeData);
      expect(store.isExpanded(documentId, contentRoot.path)).toBe(true);

      TreeUIService.toggleNode(documentId, contentRoot.path);
      expect(store.isExpanded(documentId, contentRoot.path)).toBe(false);

      const field = (contentRoot.nodeData as TargetFieldNodeData).field;
      MappingService.createFieldItem(mappingTree, field);

      const newMappingTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      newMappingTree.children = mappingTree.children.map((child) => {
        child.parent = newMappingTree;
        return child;
      });
      const targetDocNode2 = new TargetDocumentNodeData(targetDoc, newMappingTree);
      const tree2 = TreeUIService.createTree(targetDocNode2);

      const newContentRoot = tree2.contentRoots[0];
      expect(newContentRoot.nodeData).toBeInstanceOf(FieldItemNodeData);
      expect(newContentRoot.path).not.toBe(contentRoot.path);
      expect(store.isExpanded(documentId, newContentRoot.path)).toBe(false);
    });

    it('should preserve expansion state for nodes beyond INITIAL_PARSE_DEPTH across tree rebuild', () => {
      // Build the tree and navigate to a depth-3 node (which is not parsed initially)
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;

      const level1 = tree.root.children.find((n) => n.isParsed && n.children.length > 0);
      expect(level1).toBeDefined();
      const level2 = level1!.children.find((n) => n.isParsed && n.children.length > 0);
      expect(level2).toBeDefined();
      // depth-3 node: beyond INITIAL_PARSE_DEPTH, so isParsed === false initially
      const level3 = level2!.children[0];
      expect(level3).toBeDefined();
      expect(level3.isParsed).toBe(false);

      // Expand it — toggleNode triggers parsing then sets expansion to true
      TreeUIService.toggleNode(documentId, level3.path);
      expect(useDocumentTreeStore.getState().isExpanded(documentId, level3.path)).toBe(true);

      // Spy BEFORE the rebuild so we can observe what reparseExpandedNodes() calls
      const parseTreeNodeSpy = vi.spyOn(TreeParsingService, 'parseTreeNode');

      // Rebuild the tree (simulating a refreshMappingTree call)
      const tree2 = TreeUIService.createTree(sourceDocNode);

      // Re-read the store after rebuild — the store reference changes on each update
      const storeAfterRebuild = useDocumentTreeStore.getState();

      // The expansion state must survive the rebuild
      expect(storeAfterRebuild.isExpanded(documentId, level3.path)).toBe(true);

      // reparseExpandedNodes() must have called parseTreeNode for level3b — this is the
      // assertion that was impossible with the old flatten()-only checks, because level3
      // appears in flatten() simply because level2 is expanded, regardless of whether
      // reparseExpandedNodes() ran.
      const level1b = tree2.root.children.find((n) => n.isParsed && n.children.length > 0);
      const level2b = level1b!.children.find((n) => n.isParsed && n.children.length > 0);
      const level3b = level2b!.children.find((n) => n.path === level3.path);
      expect(level3b).toBeDefined();
      expect(parseTreeNodeSpy).toHaveBeenCalledWith(level3b);

      // flatten() should include the previously-expanded level2 node's children in the output
      // (level2 was expanded by the initial createTree; level3 was expanded by toggleNode)
      const expansionAfterRebuild = storeAfterRebuild.expansionState[documentId];
      const flattenedPaths = tree2.flatten(expansionAfterRebuild).map((n) => n.path);
      // level2 should appear in the flattened list because it was expanded
      expect(flattenedPaths).toContain(level2!.path);
      // level3 should appear because level2 is expanded and level3 is its child
      expect(flattenedPaths).toContain(level3.path);
    });

    it('should preserve collapsed state for a node that is unparsed in the new tree', () => {
      // Build the initial tree, navigate to depth-3 (unparsed), expand it, then collapse it
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;
      const store = useDocumentTreeStore.getState();

      const level1 = tree.root.children.find((n) => n.isParsed && n.children.length > 0);
      const level2 = level1!.children.find((n) => n.isParsed && n.children.length > 0);
      const level3 = level2!.children[0];
      expect(level3.isParsed).toBe(false);

      // Expand then collapse so savedState is explicitly false
      TreeUIService.toggleNode(documentId, level3.path); // → true
      TreeUIService.toggleNode(documentId, level3.path); // → false
      expect(store.isExpanded(documentId, level3.path)).toBe(false);

      // Rebuild: even though the node is unparsed in the new tree, the saved false must be kept
      const tree2 = TreeUIService.createTree(sourceDocNode);
      const level1b = tree2.root.children.find((n) => n.isParsed && n.children.length > 0);
      const level2b = level1b!.children.find((n) => n.isParsed && n.children.length > 0);
      const level3b = level2b!.children[0];

      expect(store.isExpanded(documentId, level3b.path)).toBe(false);
    });

    it('should skip reparseExpandedNodes for unparsed nodes whose expansion state is false', () => {
      // Build tree and expand a deep node, then collapse it before rebuild
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;

      const level1 = tree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level2 = level1.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level3 = level2.children[0];

      // Expand then immediately collapse: the node ends up with expansionState = false
      TreeUIService.toggleNode(documentId, level3.path); // → true
      TreeUIService.toggleNode(documentId, level3.path); // → false

      const parseTreeNodeSpy = vi.spyOn(TreeParsingService, 'parseTreeNode');

      TreeUIService.createTree(sourceDocNode);

      // reparseExpandedNodes must NOT add an extra parseTreeNode call beyond the single one
      // made by parseTree during the initial build of the rebuilt tree.  We locate level3b
      // in the rebuilt tree and check it was called at most once (the parseTree pass).
      const rebuiltTree = TreeUIService.getTree(documentId)!;
      const level1b = rebuiltTree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level2b = level1b.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level3b = level2b.children.find((n) => n.path === level3.path)!;

      const callsForLevel3b = parseTreeNodeSpy.mock.calls.filter(([arg]) => arg === level3b).length;
      // parseTree visits every node exactly once (including depth-3 nodes within the field budget).
      // reparseExpandedNodes must not add a second call when expansion state is false.
      expect(callsForLevel3b).toBe(1);

      parseTreeNodeSpy.mockRestore();
    });

    it('should skip reparseExpandedNodes for already-parsed nodes even if expansion state is true', () => {
      // Build tree. level2 is parsed by the initial parseTree and expansion state is true.
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;

      const level1 = tree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level2 = level1.children.find((n) => n.isParsed && n.children.length > 0)!;
      expect(level2.isParsed).toBe(true);

      const parseTreeNodeSpy = vi.spyOn(TreeParsingService, 'parseTreeNode');

      TreeUIService.createTree(sourceDocNode);

      const rebuiltTree = TreeUIService.getTree(documentId)!;
      const level1b = rebuiltTree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level2b = level1b.children.find((n) => n.path === level2.path)!;

      // level2b is parsed by parseTree (isParsed=true after that pass).
      // reparseExpandedNodes skips parsed nodes, so level2b must appear at most once in spy calls
      // (the parseTree pass). A second call would mean reparseExpandedNodes incorrectly re-parsed it.
      const callsForLevel2b = parseTreeNodeSpy.mock.calls.filter(([arg]) => arg === level2b).length;
      // parseTree calls parseTreeNode for level2b exactly once.
      // reparseExpandedNodes must not call it again because level2b.isParsed === true after parseTree.
      expect(callsForLevel2b).toBe(1);

      parseTreeNodeSpy.mockRestore();
    });

    it('should preserve stale expansion entries for paths absent from the new tree', () => {
      // First create a tree and record a path that will never appear again
      TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;

      // Manually inject a stale entry (simulates a path that belonged to a now-removed field)
      const stalePath = 'stale://path/that/does/not/exist';
      useDocumentTreeStore.getState().setTreeExpansion(documentId, {
        ...useDocumentTreeStore.getState().expansionState[documentId],
        [stalePath]: true,
      });

      // Rebuild — the stale entry must survive in the expansion state
      TreeUIService.createTree(sourceDocNode);
      const stateAfterRebuild = useDocumentTreeStore.getState().expansionState[documentId];

      expect(stateAfterRebuild[stalePath]).toBe(true);
    });

    it('should default new nodes to isNodeParsed when they have no prior expansion entry', () => {
      // On the very first createTree there is no prior state, so all entries come from isNodeParsed
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;
      const expansionState = useDocumentTreeStore.getState().expansionState[documentId];

      // Parsed nodes (depth < INITIAL_PARSE_DEPTH) default to true
      const level1 = tree.root.children.find((n) => n.isParsed)!;
      expect(expansionState[level1.path]).toBe(true);

      // Unparsed nodes (leaf / depth ≥ INITIAL_PARSE_DEPTH) default to false
      const level1WithChildren = tree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level2 = level1WithChildren.children.find((n) => n.isParsed && n.children.length > 0)!;
      const level3 = level2.children[0];
      expect(level3.isParsed).toBe(false);
      expect(expansionState[level3.path]).toBe(false);
    });
  });

  describe('invalidateNode', () => {
    it('should invalidate a parsed node so it becomes unparsed with no children', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;

      // Find a parsed node that has children
      const level1 = tree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      expect(level1.isParsed).toBe(true);
      expect(level1.children.length).toBeGreaterThan(0);

      TreeUIService.invalidateNode(documentId, level1.path);

      expect(level1.isParsed).toBe(false);
      expect(level1.children).toHaveLength(0);
    });

    it('should recursively invalidate all descendants', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;

      // Collect descendant paths before invalidation
      const level1 = tree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      const descendantsBefore = level1.children.flatMap((c) => [c, ...c.children]);
      expect(descendantsBefore.length).toBeGreaterThan(0);

      TreeUIService.invalidateNode(documentId, level1.path);

      // After invalidation the node has no children at all
      expect(level1.children).toHaveLength(0);
    });

    it('should allow the node to be re-parsed by toggleNode after invalidation', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;

      const level1 = tree.root.children.find((n) => n.isParsed && n.children.length > 0)!;
      TreeUIService.invalidateNode(documentId, level1.path);
      expect(level1.isParsed).toBe(false);

      // toggleNode must re-parse it
      const parseTreeNodeSpy = vi.spyOn(TreeParsingService, 'parseTreeNode');
      TreeUIService.toggleNode(documentId, level1.path);
      expect(parseTreeNodeSpy).toHaveBeenCalledWith(level1);

      parseTreeNodeSpy.mockRestore();
    });

    it('should do nothing when the document ID is not registered', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const level1 = tree.root.children[0]!;
      const childrenBefore = [...level1.children];

      // Unknown document ID — must be a no-op
      TreeUIService.invalidateNode('unknown-doc-id', level1.path);

      expect(level1.children).toEqual(childrenBefore);
      expect(level1.isParsed).toBe(true);
    });

    it('should do nothing when the node path is not found in the tree', () => {
      const tree = TreeUIService.createTree(sourceDocNode);
      const documentId = sourceDocNode.id;
      const level1 = tree.root.children[0]!;

      TreeUIService.invalidateNode(documentId, 'non-existent-path');

      // Existing tree nodes must be unaffected
      expect(level1.isParsed).toBe(true);
    });
  });
});
