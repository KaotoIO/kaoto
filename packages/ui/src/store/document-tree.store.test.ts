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
import { useDocumentTreeStore } from './document-tree.store';

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
    useDocumentTreeStore.setState({ expansionState: {} });
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
        'targetBody:Body://',
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-OrderId-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-OrderPerson-\d{4}$/),

        // ShipTo
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}$/),

        // Item
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}$/),

        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Name-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Address-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-City-\d{4}$/),
        expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Country-\d{4}$/),

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
});
