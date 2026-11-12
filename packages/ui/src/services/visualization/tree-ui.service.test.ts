import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { FieldItem, IfItem, MappingParentType, MappingTree, VariableItem } from '../../models/datamapper/mapping';
import {
  DocumentNodeData,
  FieldItemNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import { MappingService } from '../../services/mapping/mapping.service';
import { TreeExpansionState, useDocumentTreeStore } from '../../store/document-tree.store';
import { getAdtInXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { TargetRenderService } from './target-render.service';
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
      // Get first child which is already parsed (depth 1)
      const firstChild = tree.root.children[0];
      expect(firstChild).toBeDefined();
      expect(firstChild.isParsed).toBe(true);

      const childrenCountBefore = firstChild.children.length;
      expect(childrenCountBefore).toBeGreaterThan(0);

      // Toggle the already-parsed node
      TreeUIService.toggleNode(documentId, firstChild.path);

      // Children count should not change (no re-parsing happens)
      expect(firstChild.children).toHaveLength(childrenCountBefore);
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
  });

  describe('rows moved under an if row or out of it', () => {
    let adtSourceDoc: IDocument;
    let adtTargetDoc: IDocument;
    let adtMappingTree: MappingTree;
    let hl7Item: FieldItem;

    const createAdtDocument = (documentType: DocumentType): IDocument => {
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(
        new DocumentDefinition(documentType, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
          'ADT_IN.xsd': getAdtInXsd(),
        }),
      );
      if (!result.document) throw new Error('Failed to create the ADT_IN document');
      return result.document;
    };

    const findField = (parent: IDocument | IField, name: string): IField => {
      const field = parent.fields.find((child) => child.name === name);
      if (!field) throw new Error(`No field named '${name}'`);
      return field;
    };

    const mapSegment = (name: string) => {
      const sourceField = findField(findField(adtSourceDoc, 'HL7'), name);
      const fieldItem = MappingService.createFieldItem(hl7Item, findField(hl7Item.field, name));
      MappingService.mapToFieldWithCopyOf(sourceField, fieldItem);
      return { sourceField, fieldItem };
    };

    const mapGuardedPid = () => {
      const { sourceField, fieldItem: pidItem } = mapSegment('PID');
      const selector = pidItem.soleSelector;
      const guard = MappingService.tryAutoOptionalIfWrap(pidItem, sourceField, false);
      if (!selector || !guard) throw new Error('PID is not mapped by a guarded copy-of');
      return { pidItem, selector, guard };
    };

    const createTargetTree = (): DocumentTree => {
      const renderIndex = TargetRenderService.buildIndex(adtMappingTree, {
        sourceParameterMap: new Map<string, IDocument>(),
        sourceBody: adtSourceDoc,
      });
      return TreeUIService.createTree(new TargetDocumentNodeData(adtTargetDoc, adtMappingTree, renderIndex));
    };

    const findRow = (tree: DocumentTree, mapping: MappingParentType): DocumentTreeNode => {
      const visit = (node: DocumentTreeNode): DocumentTreeNode | undefined => {
        if (node.nodeData instanceof MappingNodeData && node.nodeData.mapping === mapping) return node;
        for (const child of node.children) {
          const row = visit(child);
          if (row) return row;
        }
        return undefined;
      };
      const row = visit(tree.root);
      if (!row) throw new Error(`No row renders ${mapping.nodePath.toString()}`);
      return row;
    };

    const findChild = (row: DocumentTreeNode, title: string): DocumentTreeNode => {
      const child = row.children.find((candidate) => candidate.nodeData.title === title);
      if (!child) throw new Error(`No row titled '${title}' under ${row.path}`);
      return child;
    };

    const getExpansion = (tree: DocumentTree): TreeExpansionState =>
      useDocumentTreeStore.getState().expansionState[tree.documentNodeId];

    const keysUnder = (expansion: TreeExpansionState, path: string): string[] =>
      Object.keys(expansion).filter((key) => key === path || key.startsWith(`${path}/`));

    beforeEach(() => {
      adtSourceDoc = createAdtDocument(DocumentType.SOURCE_BODY);
      adtTargetDoc = createAdtDocument(DocumentType.TARGET_BODY);
      adtMappingTree = new MappingTree(
        adtTargetDoc.documentType,
        adtTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      hl7Item = MappingService.createFieldItem(adtMappingTree, findField(adtTargetDoc, 'HL7'));
      useDocumentTreeStore.setState({
        expansionState: {},
        expansionStateArray: {},
        selectedNodePath: null,
        selectedNodeIsSource: false,
      });
    });

    it('should move the expansion of a guarded field and its subtree under the if row a demoted guard shows as', () => {
      const { pidItem, selector, guard } = mapGuardedPid();
      const tree1 = createTargetTree();
      const pidRow = findRow(tree1, pidItem);
      const field01Path = findChild(pidRow, 'field_01').path;
      TreeUIService.toggleNode(tree1.documentNodeId, field01Path);
      const expansionBefore = { ...getExpansion(tree1) };
      const movedKeys = keysUnder(expansionBefore, pidRow.path);

      expect(pidRow.nodeData).toHaveProperty('autoOptionalIfItem', guard);
      expect(movedKeys).toEqual(expect.arrayContaining([pidRow.path, field01Path]));
      expect(expansionBefore[pidRow.path]).toBe(true);
      expect(expansionBefore[field01Path]).toBe(true);

      MappingService.updateExpression(selector, '/HL7/PID[1]');
      const tree2 = createTargetTree();

      const ifRow = findRow(tree2, guard);
      const movedPidPath = findRow(tree2, pidItem).path;
      const expansionAfter = getExpansion(tree2);
      expect(movedPidPath).toBe(`${ifRow.path}/${pidItem.id}`);
      expect(expansionAfter[ifRow.path]).toBe(true);
      for (const oldKey of movedKeys) {
        expect(expansionAfter[movedPidPath + oldKey.slice(pidRow.path.length)]).toBe(expansionBefore[oldKey]);
      }
      expect(keysUnder(expansionAfter, pidRow.path)).toHaveLength(0);
      expect(tree2.flatten(expansionAfter).map((row) => row.path)).toContain(
        movedPidPath + field01Path.slice(pidRow.path.length),
      );
    });

    it('should move the expansion back to the field row when the guard is promoted again', () => {
      const { pidItem, selector } = mapGuardedPid();
      const tree1 = createTargetTree();
      const documentId = tree1.documentNodeId;
      const pidPath = findRow(tree1, pidItem).path;
      const field01Path = findChild(findRow(tree1, pidItem), 'field_01').path;
      TreeUIService.toggleNode(documentId, field01Path);
      MappingService.updateExpression(selector, '/HL7/PID[1]');
      const demotedPidPath = findRow(createTargetTree(), pidItem).path;

      expect(useDocumentTreeStore.getState().isExpanded(documentId, demotedPidPath)).toBe(true);

      TreeUIService.toggleNode(documentId, demotedPidPath);
      MappingService.updateExpression(selector, '/HL7/PID');
      const tree3 = createTargetTree();

      const expansionAfter = getExpansion(tree3);
      expect(findRow(tree3, pidItem).path).toBe(pidPath);
      expect(expansionAfter[pidPath]).toBe(false);
      expect(expansionAfter[field01Path]).toBe(true);
      expect(keysUnder(expansionAfter, demotedPidPath)).toHaveLength(0);
    });

    it('should move the expansion of a mapped field the user wraps in an if', () => {
      const { fieldItem: mshItem } = mapSegment('MSH');
      const tree1 = createTargetTree();
      const documentId = tree1.documentNodeId;
      const mshRow = findRow(tree1, mshItem);
      const field01Path = findChild(mshRow, 'field_01').path;
      const field15Path = findChild(mshRow, 'field_15').path;

      expect(useDocumentTreeStore.getState().isExpanded(documentId, field01Path)).toBe(true);
      expect(useDocumentTreeStore.getState().isExpanded(documentId, field15Path)).toBe(false);

      TreeUIService.toggleNode(documentId, field01Path);
      TreeUIService.toggleNode(documentId, field15Path);
      MappingService.wrapWithIf(mshItem);
      const tree2 = createTargetTree();

      const ifRow = findRow(tree2, mshItem.parent);
      const movedMshPath = findRow(tree2, mshItem).path;
      const expansionAfter = getExpansion(tree2);
      expect(mshItem.parent).toBeInstanceOf(IfItem);
      expect(movedMshPath).toBe(`${ifRow.path}/${mshItem.id}`);
      expect(expansionAfter[ifRow.path]).toBe(true);
      expect(expansionAfter[movedMshPath + field01Path.slice(mshRow.path.length)]).toBe(false);
      expect(expansionAfter[movedMshPath + field15Path.slice(mshRow.path.length)]).toBe(true);
      expect(keysUnder(expansionAfter, mshRow.path)).toHaveLength(0);
    });

    it('should keep the if row of a demoted guard collapsed when the user collapsed it before', () => {
      const { pidItem, selector, guard } = mapGuardedPid();
      const documentId = createTargetTree().documentNodeId;
      MappingService.updateExpression(selector, '/HL7/PID[1]');
      const ifPath = findRow(createTargetTree(), guard).path;

      expect(useDocumentTreeStore.getState().isExpanded(documentId, ifPath)).toBe(true);

      TreeUIService.toggleNode(documentId, ifPath);
      MappingService.updateExpression(selector, '/HL7/PID');
      createTargetTree();
      MappingService.updateExpression(selector, '/HL7/PID[1]');
      const tree4 = createTargetTree();

      const expansionAfter = getExpansion(tree4);
      expect(findRow(tree4, guard).path).toBe(ifPath);
      expect(expansionAfter[ifPath]).toBe(false);
      expect(tree4.flatten(expansionAfter).map((row) => row.path)).not.toContain(findRow(tree4, pidItem).path);
    });

    it.each([
      ['the field row', undefined],
      ['a row under the field', 'field_01'],
    ])('should keep the selection on %s at its new path when the guard is demoted', (_label, childTitle) => {
      const { pidItem, selector } = mapGuardedPid();
      const pidRow = findRow(createTargetTree(), pidItem);
      const selectedRow = childTitle ? findChild(pidRow, childTitle) : pidRow;
      useDocumentTreeStore.getState().setSelectedNode(selectedRow.path, false);

      MappingService.updateExpression(selector, '/HL7/PID[1]');
      const movedPidPath = findRow(createTargetTree(), pidItem).path;

      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(
        movedPidPath + selectedRow.path.slice(pidRow.path.length),
      );
      expect(useDocumentTreeStore.getState().selectedNodeIsSource).toBe(false);
    });

    it('should move the selection from an if row to its field row when the guard is promoted', () => {
      const { pidItem, selector, guard } = mapGuardedPid();
      MappingService.updateExpression(selector, '/HL7/PID[1]');
      useDocumentTreeStore.getState().setSelectedNode(findRow(createTargetTree(), guard).path, false);

      MappingService.updateExpression(selector, '/HL7/PID');
      const pidRow = findRow(createTargetTree(), pidItem);

      expect(pidRow.nodeData).toHaveProperty('autoOptionalIfItem', guard);
      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(pidRow.path);
      expect(useDocumentTreeStore.getState().selectedNodeIsSource).toBe(false);
    });

    it('should move the selection of a mapped field inside a container the user wraps in an if', () => {
      const mshItem = MappingService.createFieldItem(hl7Item, findField(hl7Item.field, 'MSH'));
      const mshRow = findRow(createTargetTree(), mshItem);
      const field01Item = MappingService.createFieldItem(
        mshItem,
        (findChild(mshRow, 'field_01').nodeData as TargetFieldNodeData).field,
      );
      const field01Path = findRow(createTargetTree(), field01Item).path;
      useDocumentTreeStore.getState().setSelectedNode(field01Path, false);

      MappingService.wrapWithIf(mshItem);
      const tree = createTargetTree();

      const movedField01Path = findRow(tree, field01Item).path;
      expect(movedField01Path).toBe(`${findRow(tree, mshItem.parent).path}/${mshItem.id}/${field01Item.id}`);
      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(movedField01Path);
    });

    it('should move the selection to the row of a field that gets mapped', () => {
      const unmappedMshPath = findChild(findRow(createTargetTree(), hl7Item), 'MSH').path;
      useDocumentTreeStore.getState().setSelectedNode(unmappedMshPath, false);

      const { fieldItem: mshItem } = mapSegment('MSH');
      const tree = createTargetTree();

      const mshPath = findRow(tree, mshItem).path;
      expect(mshPath).not.toBe(unmappedMshPath);
      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(mshPath);
    });

    it('should move the selection to the row of a field that gets mapped behind a new guard', () => {
      const unmappedPidPath = findChild(findRow(createTargetTree(), hl7Item), 'PID').path;
      useDocumentTreeStore.getState().setSelectedNode(unmappedPidPath, false);

      const { pidItem, guard } = mapGuardedPid();
      const tree = createTargetTree();

      expect(pidItem.parent).toBe(guard);
      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(findRow(tree, pidItem).path);
    });

    it('should move the selection to the row of a field mapped together with its parent under a mapped field', () => {
      const unmappedMshRow = findChild(findRow(createTargetTree(), hl7Item), 'MSH');
      const unmappedField01Row = findChild(unmappedMshRow, 'field_01');
      useDocumentTreeStore.getState().setSelectedNode(unmappedField01Row.path, false);

      const mshItem = MappingService.createFieldItem(hl7Item, (unmappedMshRow.nodeData as TargetFieldNodeData).field);
      const field01Item = MappingService.createFieldItem(
        mshItem,
        (unmappedField01Row.nodeData as TargetFieldNodeData).field,
      );
      const tree = createTargetTree();

      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(findRow(tree, field01Item).path);
    });

    it('should not move the selection of a field inside a variable onto the unmapped row of its field', () => {
      const variable = new VariableItem(hl7Item, 'segment');
      hl7Item.children.push(variable);
      const variableMshItem = new FieldItem(variable, findField(hl7Item.field, 'MSH'));
      variable.children.push(variableMshItem);
      const variableMshPath = findRow(createTargetTree(), variableMshItem).path;
      useDocumentTreeStore.getState().setSelectedNode(variableMshPath, false);

      variable.children = [];
      createTargetTree();

      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(variableMshPath);
    });

    it('should not move the selection of a field removed with its parent from inside a variable', () => {
      const variable = new VariableItem(adtMappingTree, 'message');
      adtMappingTree.children.push(variable);
      const variableHl7Item = new FieldItem(variable, hl7Item.field);
      variable.children.push(variableHl7Item);
      const variableMshItem = new FieldItem(variableHl7Item, findField(hl7Item.field, 'MSH'));
      variableHl7Item.children.push(variableMshItem);
      const variableMshPath = findRow(createTargetTree(), variableMshItem).path;
      useDocumentTreeStore.getState().setSelectedNode(variableMshPath, false);

      variable.children = [];
      createTargetTree();

      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(variableMshPath);
    });

    it('should move the selection to the row of a field mapped together with its parent at the document root', () => {
      adtMappingTree.children = [];
      const unmappedMshPath = findChild(createTargetTree().contentRoots[0], 'MSH').path;
      useDocumentTreeStore.getState().setSelectedNode(unmappedMshPath, false);

      adtMappingTree.children.push(hl7Item);
      const { fieldItem: mshItem } = mapSegment('MSH');
      const tree = createTargetTree();

      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(findRow(tree, mshItem).path);
    });

    it('should move the expansion of a row to the row of its field once it gets mapped', () => {
      const tree1 = createTargetTree();
      const documentId = tree1.documentNodeId;
      const unmappedMshPath = findChild(findRow(tree1, hl7Item), 'MSH').path;
      const wasExpanded = useDocumentTreeStore.getState().isExpanded(documentId, unmappedMshPath);
      TreeUIService.toggleNode(documentId, unmappedMshPath);

      const { fieldItem: mshItem } = mapSegment('MSH');
      const tree2 = createTargetTree();

      expect(useDocumentTreeStore.getState().isExpanded(documentId, findRow(tree2, mshItem).path)).toBe(!wasExpanded);
      expect(keysUnder(getExpansion(tree2), unmappedMshPath)).toHaveLength(0);
    });

    it('should move the selection to the unmapped row of a field whose mapping is deleted', () => {
      mapSegment('PID');
      const { fieldItem: mshItem } = mapSegment('MSH');
      const mshPath = findRow(createTargetTree(), mshItem).path;
      useDocumentTreeStore.getState().setSelectedNode(mshPath, false);

      MappingService.deleteMappingItem(mshItem);
      const tree = createTargetTree();

      const unmappedMshPath = findChild(findRow(tree, hl7Item), 'MSH').path;
      expect(unmappedMshPath).not.toBe(mshPath);
      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(unmappedMshPath);
    });

    it('should keep the selection of a row that the moves leave in place', () => {
      const { fieldItem: mshItem } = mapSegment('MSH');
      const { selector } = mapGuardedPid();
      const mshPath = findRow(createTargetTree(), mshItem).path;
      useDocumentTreeStore.getState().setSelectedNode(mshPath, false);

      MappingService.updateExpression(selector, '/HL7/PID[1]');
      const tree = createTargetTree();

      expect(findRow(tree, mshItem).path).toBe(mshPath);
      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(mshPath);
    });

    it('should leave a source selection alone when the guard is demoted', () => {
      const { selector } = mapGuardedPid();
      createTargetTree();
      const sourceTree = TreeUIService.createTree(new DocumentNodeData(adtSourceDoc));
      const sourcePidPath = findChild(sourceTree.contentRoots[0], 'PID').path;
      useDocumentTreeStore.getState().setSelectedNode(sourcePidPath, true);

      MappingService.updateExpression(selector, '/HL7/PID[1]');
      createTargetTree();

      expect(useDocumentTreeStore.getState().selectedNodePath).toBe(sourcePidPath);
      expect(useDocumentTreeStore.getState().selectedNodeIsSource).toBe(true);
    });
  });
});
