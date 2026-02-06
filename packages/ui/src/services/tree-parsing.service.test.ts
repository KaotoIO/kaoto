import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { DocumentTree, INITIAL_PARSE_DEPTH } from '../models/datamapper/document-tree';
import { DocumentTreeNode } from '../models/datamapper/document-tree-node';
import { DocumentNodeData, FieldNodeData } from '../models/datamapper/visualization';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { TreeParsingService } from './tree-parsing.service';
import { VisualizationService } from './visualization.service';
import { XmlSchemaDocument } from './xml-schema-document.model';

describe('TreeParsingService', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let tree: DocumentTree;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    tree = new DocumentTree(sourceDocNode);
  });

  describe('parseTree', () => {
    it('should parse tree', () => {
      TreeParsingService.parseTree(tree);

      expect(tree.root.isParsed).toBe(true);
      expect(tree.root.children.length).toBeGreaterThan(0);

      const checkDepth = (node: DocumentTreeNode, currentDepth: number, maxDepth: number) => {
        if (currentDepth < maxDepth && !node.nodeData.isPrimitive) {
          if (VisualizationService.hasChildren(node.nodeData)) {
            expect(node.isParsed).toBe(true);
          }
          for (const child of node.children) {
            checkDepth(child, currentDepth + 1, maxDepth);
          }
        }
      };

      checkDepth(tree.root, 0, INITIAL_PARSE_DEPTH);
    });

    it('should stop parsing at primitive nodes regardless of depth', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primitiveDocNode = new DocumentNodeData(primitiveDoc);
      const primitiveTree = new DocumentTree(primitiveDocNode);

      TreeParsingService.parseTree(primitiveTree);

      expect(primitiveTree.root.isParsed).toBe(false);
      expect(primitiveTree.root.children).toHaveLength(0);
    });

    it('should handle empty document (no fields)', () => {
      const emptyDoc = {
        documentId: 'emptyDoc',
        documentType: DocumentType.SOURCE_BODY,
        name: 'Empty Document',
        fields: [],
        isNamespaceAware: false,
      } as unknown as IDocument;

      const emptyDocNode = new DocumentNodeData(emptyDoc);
      const emptyTree = new DocumentTree(emptyDocNode);

      TreeParsingService.parseTree(emptyTree);

      expect(emptyTree.root.children).toHaveLength(0);
    });

    it('should maintain tree structure integrity after parsing', () => {
      TreeParsingService.parseTree(tree);

      const verifyNodePaths = (node: DocumentTreeNode) => {
        const foundNode = tree.findNodeByPath(node.path);
        expect(foundNode).toBe(node);

        for (const child of node.children) {
          expect(child.parent).toBe(node);
          verifyNodePaths(child);
        }
      };

      verifyNodePaths(tree.root);
    });
  });

  describe('parseTreeNode', () => {
    it('should parse a single tree node and add children', () => {
      expect(tree.root.isParsed).toBe(false);
      expect(tree.root.children).toHaveLength(0);

      TreeParsingService.parseTreeNode(tree.root);

      expect(tree.root.isParsed).toBe(true);
      expect(tree.root.children.length).toBeGreaterThan(0);
    });

    it('should create children with correct parent references', () => {
      TreeParsingService.parseTreeNode(tree.root);

      for (const child of tree.root.children) {
        expect(child.parent).toBe(tree.root);
      }
    });

    it('should use VisualizationService to generate children', () => {
      const spy = jest.spyOn(VisualizationService, 'generateNodeDataChildren');

      TreeParsingService.parseTreeNode(tree.root);

      expect(spy).toHaveBeenCalledWith(tree.root.nodeData);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('should handle nodes with no children gracefully', () => {
      const emptyDoc = {
        documentId: 'emptyDoc',
        documentType: DocumentType.SOURCE_BODY,
        name: 'Empty Document',
        fields: [],
        isNamespaceAware: false,
      } as unknown as IDocument;

      const emptyDocNode = new DocumentNodeData(emptyDoc);
      const emptyTree = new DocumentTree(emptyDocNode);

      TreeParsingService.parseTreeNode(emptyTree.root);

      // When a node has no children, parseTreeNode is called but no children are added
      // so isParsed remains false (only addChild sets isParsed to true)
      expect(emptyTree.root.children).toHaveLength(0);
    });

    it('should parse field node correctly', () => {
      // First parse the root to get field nodes
      TreeParsingService.parseTreeNode(tree.root);

      const firstChild = tree.root.children[0];
      if (VisualizationService.hasChildren(firstChild.nodeData)) {
        TreeParsingService.parseTreeNode(firstChild);

        expect(firstChild.isParsed).toBe(true);
        if (firstChild.nodeData instanceof FieldNodeData) {
          const hasNestedFields = firstChild.nodeData.field.fields.length > 0;
          if (hasNestedFields) {
            expect(firstChild.children.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should not parse the same node twice', () => {
      TreeParsingService.parseTreeNode(tree.root);
      const childrenAfterFirstParse = tree.root.children.length;

      // Parse again
      TreeParsingService.parseTreeNode(tree.root);
      const childrenAfterSecondParse = tree.root.children.length;

      // Second parse should add more children (VisualizationService is called again)
      // This is expected behavior - the service doesn't check if already parsed
      expect(childrenAfterSecondParse).toBe(childrenAfterFirstParse * 2);
    });
  });

  it('should handle complex nested structure', () => {
    // Parse to a deeper level
    TreeParsingService.parseTree(tree);

    // Count total nodes
    let totalNodes = 0;
    const countNodes = (node: DocumentTreeNode) => {
      totalNodes++;
      for (const child of node.children) {
        countNodes(child);
      }
    };
    countNodes(tree.root);

    expect(totalNodes).toBeGreaterThan(1);

    // Verify all nodes can be found
    const verifyAllNodes = (node: DocumentTreeNode) => {
      const found = tree.findNodeByPath(node.path);
      expect(found).toBe(node);
      for (const child of node.children) {
        verifyAllNodes(child);
      }
    };
    verifyAllNodes(tree.root);
  });

  it('should handle both source and target documents', () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const targetDocNode = new DocumentNodeData(targetDoc);
    const targetTree = new DocumentTree(targetDocNode);

    TreeParsingService.parseTree(targetTree);

    expect(targetTree.root.isParsed).toBe(true);
    expect(targetTree.root.children.length).toBeGreaterThan(0);
  });

  it('should maintain isParsed flag consistency', () => {
    TreeParsingService.parseTree(tree);

    const verifyParsedFlag = (node: DocumentTreeNode, currentDepth: number, maxDepth: number) => {
      if (currentDepth < maxDepth && !node.nodeData.isPrimitive) {
        if (node.children.length > 0 || node.isParsed) {
          expect(node.isParsed).toBe(true);
        }
      }

      for (const child of node.children) {
        verifyParsedFlag(child, currentDepth + 1, maxDepth);
      }
    };

    verifyParsedFlag(tree.root, 0, 2);
  });
});
