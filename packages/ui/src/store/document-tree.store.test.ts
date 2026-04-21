import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { DocumentTree } from '../models/datamapper/document-tree';
import { DocumentNodeData } from '../models/datamapper/visualization';
import { TreeParsingService } from '../services/tree-parsing.service';
import { XmlSchemaDocument } from '../services/xml-schema-document.model';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { TreeConnectionPorts, useDocumentTreeStore } from './document-tree.store';

describe('useDocumentTreeStore', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let tree: DocumentTree;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    tree = new DocumentTree(sourceDocNode);
  });

  afterEach(() => {
    useDocumentTreeStore.setState({
      expansionState: {},
      nodesConnectionPorts: {},
      selectedNodePath: null,
      selectedNodeIsSource: false,
      targetXPathInputForFocus: null,
    });
  });

  it('should start with empty state', () => {
    const state = useDocumentTreeStore.getState();

    expect(state).toMatchObject({ expansionState: {} });
  });

  describe('updateTreeExpansion', () => {
    it('should set first level state to false for an unparsed tree', () => {
      useDocumentTreeStore.getState().updateTreeExpansion(tree);
      const state = useDocumentTreeStore.getState().expansionState;

      expect(state).toEqual({
        ['doc-sourceBody-Body']: {
          ['sourceBody:Body://']: false,
        },
      });
      expect(Object.keys(state)).toHaveLength(1);
    });

    it('should set expansion state', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const targetDocNode = new DocumentNodeData(targetDoc);
      tree = new DocumentTree(targetDocNode);
      TreeParsingService.parseTree(tree);

      useDocumentTreeStore.getState().updateTreeExpansion(tree);
      const state = useDocumentTreeStore.getState().expansionState;
      const keys = Object.keys(state[tree.documentId]);

      expect(keys).toEqual([
        // DFS order: Root -> ShipOrder -> children -> grandchildren (maxFields extends beyond maxDepth)
        'targetBody:Body://',
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-OrderId-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-OrderPerson-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}$/),
        // ShipTo children (depth-first: complete this subtree before moving to Item)
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Name-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Address-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-City-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Country-\d{4}$/),
        // Item and its children
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Title-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Note-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Quantity-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Price-\d{4}$/),
      ]);
      expect(keys).toHaveLength(14);
    });

    it('should not include primitive nodes in expansion state', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primitiveDocNode = new DocumentNodeData(primitiveDoc);
      const primitiveTree = new DocumentTree(primitiveDocNode);

      TreeParsingService.parseTree(primitiveTree);

      useDocumentTreeStore.getState().updateTreeExpansion(tree);
      const state = useDocumentTreeStore.getState().expansionState;
      const keys = Object.keys(state[tree.documentId]);

      expect(keys).toEqual(['sourceBody:Body://']);
    });

    it('should keep the existing expansion state for matching keys', () => {
      // First parse the tree to get actual node paths with real IDs
      TreeParsingService.parseTree(tree);
      useDocumentTreeStore.getState().updateTreeExpansion(tree);

      // Get the actual paths from the tree after initial expansion
      const initialState = useDocumentTreeStore.getState().expansionState[tree.documentId];
      const paths = Object.keys(initialState);

      // Find a path that has children (not root or leaf)
      const rootPath = paths[0]; // 'sourceBody:Body://'
      const childPath = paths[1]; // First child path (with random ID)

      // Set custom expansion state: root expanded (true), child collapsed (false)
      useDocumentTreeStore.setState({
        expansionState: {
          [tree.documentId]: {
            [rootPath]: true,
            [childPath]: false,
          },
        },
      });

      // Call updateTreeExpansion again - should preserve existing states
      useDocumentTreeStore.getState().updateTreeExpansion(tree);
      const state = useDocumentTreeStore.getState().expansionState[tree.documentId];

      // Verify that the custom states were preserved for matching keys
      expect(state[rootPath]).toBe(true);
      expect(state[childPath]).toBe(false);
    });
  });

  describe('setNodesConnectionPorts', () => {
    it('should set connection ports for a document', () => {
      const documentId = 'test-doc-id';
      const ports: TreeConnectionPorts = {
        path1: [10, 20],
        path2: [30, 40],
      };

      useDocumentTreeStore.getState().setNodesConnectionPorts(documentId, ports);
      const state = useDocumentTreeStore.getState();

      expect(state.nodesConnectionPorts[documentId]).toEqual(ports);
      expect(state.nodesConnectionPortsArray[documentId]).toEqual(['path1', 'path2']);
    });

    it('should update connection ports for an existing document', () => {
      const documentId = 'test-doc-id';
      const initialPorts: TreeConnectionPorts = { path1: [10, 20] };
      const updatedPorts: TreeConnectionPorts = { path1: [15, 25], path2: [30, 40] };

      useDocumentTreeStore.getState().setNodesConnectionPorts(documentId, initialPorts);
      useDocumentTreeStore.getState().setNodesConnectionPorts(documentId, updatedPorts);
      const state = useDocumentTreeStore.getState();

      expect(state.nodesConnectionPorts[documentId]).toEqual(updatedPorts);
      expect(state.nodesConnectionPortsArray[documentId]).toEqual(['path1', 'path2']);
    });

    it('should filter out paths containing :EDGE: from nodesConnectionPortsArray', () => {
      const documentId = 'test-doc-id';
      const ports: TreeConnectionPorts = {
        path1: [10, 20],
        'path2:EDGE:': [30, 40],
        path3: [50, 60],
        'some:EDGE:path': [70, 80],
      };

      useDocumentTreeStore.getState().setNodesConnectionPorts(documentId, ports);
      const state = useDocumentTreeStore.getState();

      // All ports should be in nodesConnectionPorts
      expect(state.nodesConnectionPorts[documentId]).toEqual(ports);

      // Only non-EDGE paths should be in nodesConnectionPortsArray
      expect(state.nodesConnectionPortsArray[documentId]).toEqual(['path1', 'path3']);
      expect(state.nodesConnectionPortsArray[documentId]).not.toContain('path2:EDGE:');
      expect(state.nodesConnectionPortsArray[documentId]).not.toContain('some:EDGE:path');
    });
  });

  describe('toggleExpansion', () => {
    it('should toggle expansion state from false to true', () => {
      const documentId = tree.documentId;
      const nodePath = 'sourceBody:Body://';

      // Set initial state to false
      useDocumentTreeStore.setState({
        expansionState: {
          [documentId]: {
            [nodePath]: false,
          },
        },
      });

      useDocumentTreeStore.getState().toggleExpansion(documentId, nodePath);
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentId][nodePath]).toBe(true);
    });

    it('should toggle expansion state from true to false', () => {
      const documentId = tree.documentId;
      const nodePath = 'sourceBody:Body://';

      // Set initial state to true
      useDocumentTreeStore.setState({
        expansionState: {
          [documentId]: {
            [nodePath]: true,
          },
        },
      });

      useDocumentTreeStore.getState().toggleExpansion(documentId, nodePath);
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentId][nodePath]).toBe(false);
    });

    it('should create expansion state for new document', () => {
      const documentId = 'new-doc-id';
      const nodePath = 'new:path://';

      useDocumentTreeStore.getState().toggleExpansion(documentId, nodePath);
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentId][nodePath]).toBe(true);
    });
  });

  describe('XPath input focus management', () => {
    it('should match XPath input focus paths with different random suffixes', () => {
      useDocumentTreeStore
        .getState()
        .requestXPathInputFocus('targetBody:Body://fj-map-1255-2922/fj-map-Address-6894-3031/fj-string-City-1404-3876');

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(
        'targetBody:Body://fj-map-1255/fj-map-Address-6894/fj-string-City-1404',
      );
      expect(
        useDocumentTreeStore
          .getState()
          .shouldFocusXPathInput(
            'targetBody:Body://fj-map-1255-9999/fj-map-Address-6894-1111/fj-string-City-1404-2222',
          ),
      ).toBe(true);
    });

    it('should match target field and field item paths for the same field', () => {
      useDocumentTreeStore
        .getState()
        .requestXPathInputFocus('targetBody:Body://fj-map-Address-6894/fj-string-City-8276');

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(
        'targetBody:Body://fj-map-Address-6894/fj-string-City-8276',
      );
      expect(
        useDocumentTreeStore
          .getState()
          .shouldFocusXPathInput('targetBody:Body://fj-map-Address-6894/fj-string-City-8276-4288'),
      ).toBe(true);
    });

    it('should clear XPath input focus request', () => {
      useDocumentTreeStore
        .getState()
        .requestXPathInputFocus('targetBody:Body://fj-map-1255-2922/fj-map-Address-6894-3031/fj-string-City-1404-3876');

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(
        'targetBody:Body://fj-map-1255/fj-map-Address-6894/fj-string-City-1404',
      );

      useDocumentTreeStore.getState().clearXPathInputFocusRequest();

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
      expect(
        useDocumentTreeStore
          .getState()
          .shouldFocusXPathInput(
            'targetBody:Body://fj-map-1255-9999/fj-map-Address-6894-1111/fj-string-City-1404-2222',
          ),
      ).toBe(false);
    });
  });

  describe('isExpanded', () => {
    it('should return true for expanded node', () => {
      const documentId = tree.documentId;
      const nodePath = 'sourceBody:Body://';

      useDocumentTreeStore.setState({
        expansionState: {
          [documentId]: {
            [nodePath]: true,
          },
        },
      });

      const isExpanded = useDocumentTreeStore.getState().isExpanded(documentId, nodePath);

      expect(isExpanded).toBe(true);
    });

    it('should return false for collapsed node', () => {
      const documentId = tree.documentId;
      const nodePath = 'sourceBody:Body://';

      useDocumentTreeStore.setState({
        expansionState: {
          [documentId]: {
            [nodePath]: false,
          },
        },
      });

      const isExpanded = useDocumentTreeStore.getState().isExpanded(documentId, nodePath);

      expect(isExpanded).toBe(false);
    });

    it('should return false for non-existent node', () => {
      const documentId = 'non-existent-doc';
      const nodePath = 'non-existent:path://';

      const isExpanded = useDocumentTreeStore.getState().isExpanded(documentId, nodePath);

      expect(isExpanded).toBe(false);
    });
  });

  describe('setSelectedNode', () => {
    it('should set selected node as source', () => {
      const nodePath = 'sourceBody:Body://';

      useDocumentTreeStore.getState().setSelectedNode(nodePath, true);
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBe(nodePath);
      expect(state.selectedNodeIsSource).toBe(true);
    });

    it('should set selected node as target', () => {
      const nodePath = 'targetBody:Body://';

      useDocumentTreeStore.getState().setSelectedNode(nodePath, false);
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBe(nodePath);
      expect(state.selectedNodeIsSource).toBe(false);
    });

    it('should clear selection when nodePath is null', () => {
      // First set a selection
      useDocumentTreeStore.getState().setSelectedNode('some:path://', true);

      // Then clear it
      useDocumentTreeStore.getState().setSelectedNode(null, false);
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBeNull();
      expect(state.selectedNodeIsSource).toBe(false);
    });
  });

  describe('toggleSelectedNode', () => {
    it('should select a node when nothing is selected', () => {
      const nodePath = 'sourceBody:Body://';

      useDocumentTreeStore.getState().toggleSelectedNode(nodePath, true);
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBe(nodePath);
      expect(state.selectedNodeIsSource).toBe(true);
    });

    it('should deselect a node when it is already selected', () => {
      const nodePath = 'sourceBody:Body://';

      // First select the node
      useDocumentTreeStore.getState().setSelectedNode(nodePath, true);

      // Then toggle it (should deselect)
      useDocumentTreeStore.getState().toggleSelectedNode(nodePath, true);
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBeNull();
      expect(state.selectedNodeIsSource).toBe(false);
    });

    it('should switch selection to a different node', () => {
      const firstPath = 'sourceBody:Body://';
      const secondPath = 'targetBody:Body://';

      // Select first node
      useDocumentTreeStore.getState().setSelectedNode(firstPath, true);

      // Toggle second node (should switch selection)
      useDocumentTreeStore.getState().toggleSelectedNode(secondPath, false);
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBe(secondPath);
      expect(state.selectedNodeIsSource).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear the selection', () => {
      // First set a selection
      useDocumentTreeStore.getState().setSelectedNode('some:path://', true);

      // Then clear it
      useDocumentTreeStore.getState().clearSelection();
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBeNull();
      expect(state.selectedNodeIsSource).toBe(false);
    });

    it('should work when nothing is selected', () => {
      useDocumentTreeStore.getState().clearSelection();
      const state = useDocumentTreeStore.getState();

      expect(state.selectedNodePath).toBeNull();
      expect(state.selectedNodeIsSource).toBe(false);
    });
  });

  describe('isNodeSelected', () => {
    it('should return true for selected node', () => {
      const nodePath = 'sourceBody:Body://';

      useDocumentTreeStore.getState().setSelectedNode(nodePath, true);
      const isSelected = useDocumentTreeStore.getState().isNodeSelected(nodePath, true);

      expect(isSelected).toBe(true);
    });

    it('should return false for non-selected node', () => {
      const selectedPath = 'sourceBody:Body://';
      const otherPath = 'targetBody:Body://';

      useDocumentTreeStore.getState().setSelectedNode(selectedPath, true);
      const isSelected = useDocumentTreeStore.getState().isNodeSelected(otherPath, true);

      expect(isSelected).toBe(false);
    });

    it('should return false when nothing is selected', () => {
      const nodePath = 'sourceBody:Body://';

      const isSelected = useDocumentTreeStore.getState().isNodeSelected(nodePath, true);

      expect(isSelected).toBe(false);
    });

    it('should return false when same path but different isSource side', () => {
      const nodePath = 'order:Body://id';

      useDocumentTreeStore.getState().setSelectedNode(nodePath, true);
      const isSelected = useDocumentTreeStore.getState().isNodeSelected(nodePath, false);

      expect(isSelected).toBe(false);
    });
  });
});
