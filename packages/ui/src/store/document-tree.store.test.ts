import { BODY_DOCUMENT_ID, DocumentType, PrimitiveDocument } from '../models/datamapper/document';
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
      const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const primitiveDocNode = new DocumentNodeData(primitiveDoc);
      const primitiveTree = new DocumentTree(primitiveDocNode);

      TreeParsingService.parseTree(primitiveTree);

      useDocumentTreeStore.getState().updateTreeExpansion(tree);
      const state = useDocumentTreeStore.getState().expansionState;
      const keys = Object.keys(state[tree.documentId]);

      expect(keys).toEqual(['sourceBody:Body://']);
    });

    /** This test needs to be skipped while the datamapper uses random IDs */
    it.skip('should keep the existing expansion state for matchign keys', () => {
      useDocumentTreeStore.setState({
        expansionState: {
          ['doc-sourceBody-Body']: {
            ['sourceBody:Body://']: true,
            ['sourceBody:Body://fxShipOrder-1234']: false,
          },
        },
      });

      useDocumentTreeStore.getState().updateTreeExpansion(tree);
      const state = useDocumentTreeStore.getState().expansionState[tree.documentId];

      expect(state).toEqual({
        'sourceBody:Body://': true,
        'sourceBody:Body://fx-ShipOrder-1234': false,
        // Other keys
      });
    });
  });
});
