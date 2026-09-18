import { DocumentTree } from '../models/datamapper/document-tree';
import { DocumentNodeData } from '../models/datamapper/visualization';
import { XmlSchemaDocument } from '../services/document/xml-schema/xml-schema-document.model';
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
  describe('setTreeExpansion', () => {
    it('should set expansion state and array for a document', () => {
      const documentNodeId = 'test-doc-id';
      const expansionState = { path1: true, path2: false, path3: true };

      useDocumentTreeStore.getState().setTreeExpansion(documentNodeId, expansionState);
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentNodeId]).toEqual(expansionState);
      expect(state.expansionStateArray[documentNodeId]).toEqual(['path1', 'path2', 'path3']);
    });

    it('should overwrite previous expansion state for the same document', () => {
      const documentNodeId = 'test-doc-id';
      useDocumentTreeStore.getState().setTreeExpansion(documentNodeId, { path1: true, path2: false });
      useDocumentTreeStore.getState().setTreeExpansion(documentNodeId, { path3: true });
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentNodeId]).toEqual({ path3: true });
      expect(state.expansionStateArray[documentNodeId]).toEqual(['path3']);
    });
  });

  describe('setNodesConnectionPorts', () => {
    it('should set connection ports for a document', () => {
      const documentNodeId = 'test-doc-id';
      const ports: TreeConnectionPorts = {
        path1: [10, 20],
        path2: [30, 40],
      };

      useDocumentTreeStore.getState().setNodesConnectionPorts(documentNodeId, ports);
      const state = useDocumentTreeStore.getState();

      expect(state.nodesConnectionPorts[documentNodeId]).toEqual(ports);
      expect(state.nodesConnectionPortsArray[documentNodeId]).toEqual(['path1', 'path2']);
    });

    it('should update connection ports for an existing document', () => {
      const documentNodeId = 'test-doc-id';
      const initialPorts: TreeConnectionPorts = { path1: [10, 20] };
      const updatedPorts: TreeConnectionPorts = { path1: [15, 25], path2: [30, 40] };

      useDocumentTreeStore.getState().setNodesConnectionPorts(documentNodeId, initialPorts);
      useDocumentTreeStore.getState().setNodesConnectionPorts(documentNodeId, updatedPorts);
      const state = useDocumentTreeStore.getState();

      expect(state.nodesConnectionPorts[documentNodeId]).toEqual(updatedPorts);
      expect(state.nodesConnectionPortsArray[documentNodeId]).toEqual(['path1', 'path2']);
    });

    it('should filter out paths containing :EDGE: from nodesConnectionPortsArray', () => {
      const documentNodeId = 'test-doc-id';
      const ports: TreeConnectionPorts = {
        path1: [10, 20],
        'path2:EDGE:': [30, 40],
        path3: [50, 60],
        'some:EDGE:path': [70, 80],
      };

      useDocumentTreeStore.getState().setNodesConnectionPorts(documentNodeId, ports);
      const state = useDocumentTreeStore.getState();

      // All ports should be in nodesConnectionPorts
      expect(state.nodesConnectionPorts[documentNodeId]).toEqual(ports);

      // Only non-EDGE paths should be in nodesConnectionPortsArray
      expect(state.nodesConnectionPortsArray[documentNodeId]).toEqual(['path1', 'path3']);
      expect(state.nodesConnectionPortsArray[documentNodeId]).not.toContain('path2:EDGE:');
      expect(state.nodesConnectionPortsArray[documentNodeId]).not.toContain('some:EDGE:path');
    });
  });

  describe('toggleExpansion', () => {
    it('should toggle expansion state from false to true', () => {
      const documentNodeId = tree.documentNodeId;
      const nodePath = 'sourceBody:Body://';

      // Set initial state to false
      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeId]: {
            [nodePath]: false,
          },
        },
      });

      useDocumentTreeStore.getState().toggleExpansion(documentNodeId, nodePath);
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentNodeId][nodePath]).toBe(true);
    });

    it('should toggle expansion state from true to false', () => {
      const documentNodeId = tree.documentNodeId;
      const nodePath = 'sourceBody:Body://';

      // Set initial state to true
      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeId]: {
            [nodePath]: true,
          },
        },
      });

      useDocumentTreeStore.getState().toggleExpansion(documentNodeId, nodePath);
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentNodeId][nodePath]).toBe(false);
    });

    it('should create expansion state for new document', () => {
      const documentNodeId = 'new-doc-id';
      const nodePath = 'new:path://';

      useDocumentTreeStore.getState().toggleExpansion(documentNodeId, nodePath);
      const state = useDocumentTreeStore.getState();

      expect(state.expansionState[documentNodeId][nodePath]).toBe(true);
    });
  });

  describe('XPath input focus management', () => {
    it('should request focus for exact mapping node path', () => {
      const mappingNodePath = 'targetBody:Body://fj-map-1255/fj-map-Address-6894/fj-string-City-1404';

      useDocumentTreeStore.getState().requestXPathInputFocus(mappingNodePath);

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(mappingNodePath);
      expect(useDocumentTreeStore.getState().shouldFocusXPathInput(mappingNodePath)).toBe(true);
    });

    it('should not match different mapping node paths', () => {
      const mappingNodePath1 = 'targetBody:Body://fj-map-Address-6894/fj-string-City-8276';
      const mappingNodePath2 = 'targetBody:Body://fj-map-Address-6894/fj-string-Name-1234';

      useDocumentTreeStore.getState().requestXPathInputFocus(mappingNodePath1);

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(mappingNodePath1);
      expect(useDocumentTreeStore.getState().shouldFocusXPathInput(mappingNodePath1)).toBe(true);
      expect(useDocumentTreeStore.getState().shouldFocusXPathInput(mappingNodePath2)).toBe(false);
    });

    it('should clear XPath input focus request', () => {
      const mappingNodePath = 'targetBody:Body://fj-map-1255/fj-map-Address-6894/fj-string-City-1404';

      useDocumentTreeStore.getState().requestXPathInputFocus(mappingNodePath);

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(mappingNodePath);

      useDocumentTreeStore.getState().clearXPathInputFocusRequest();

      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
      expect(useDocumentTreeStore.getState().shouldFocusXPathInput(mappingNodePath)).toBe(false);
    });
  });

  describe('isExpanded', () => {
    it('should return true for expanded node', () => {
      const documentNodeId = tree.documentNodeId;
      const nodePath = 'sourceBody:Body://';

      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeId]: {
            [nodePath]: true,
          },
        },
      });

      const isExpanded = useDocumentTreeStore.getState().isExpanded(documentNodeId, nodePath);

      expect(isExpanded).toBe(true);
    });

    it('should return false for collapsed node', () => {
      const documentNodeId = tree.documentNodeId;
      const nodePath = 'sourceBody:Body://';

      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeId]: {
            [nodePath]: false,
          },
        },
      });

      const isExpanded = useDocumentTreeStore.getState().isExpanded(documentNodeId, nodePath);

      expect(isExpanded).toBe(false);
    });

    it('should return false for non-existent node', () => {
      const documentNodeId = 'non-existent-doc';
      const nodePath = 'non-existent:path://';

      const isExpanded = useDocumentTreeStore.getState().isExpanded(documentNodeId, nodePath);

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
