import { DocumentType, IDocument } from './document';
import { DocumentTree, INITIAL_PARSE_DEPTH } from './document-tree';
import { DocumentTreeNode } from './document-tree-node';
import { NodePath } from './nodepath';
import { DocumentNodeData } from './visualization';

describe('document-tree.ts', () => {
  describe('INITIAL_PARSE_DEPTH', () => {
    it('should be defined as 3', () => {
      expect(INITIAL_PARSE_DEPTH).toBe(3);
    });
  });

  describe('DocumentTree', () => {
    let mockDocument: IDocument;
    let mockDocumentNodeData: DocumentNodeData;

    beforeEach(() => {
      mockDocument = {
        documentId: 'testDoc',
        documentType: DocumentType.SOURCE_BODY,
        name: 'Test Document',
      } as IDocument;

      mockDocumentNodeData = new DocumentNodeData(mockDocument);
    });

    describe('constructor', () => {
      it('should create a DocumentTree with a root node', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        expect(tree).toBeInstanceOf(DocumentTree);
        expect(tree.documentId).toEqual(mockDocumentNodeData.id);
        expect(tree.root).toBeInstanceOf(DocumentTreeNode);
        expect(tree.root.nodeData).toBe(mockDocumentNodeData);
      });

      it('should initialize root node with correct properties', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        expect(tree.root.parent).toBeUndefined();
        expect(tree.root.isParsed).toBe(false);
        expect(tree.root.children).toEqual([]);
        expect(tree.root.path).toBe('sourceBody:testDoc://');
      });

      it('should handle different document types', () => {
        const targetDocument = {
          documentId: 'targetDoc',
          documentType: DocumentType.TARGET_BODY,
          name: 'Target Document',
        } as IDocument;

        const targetNodeData = new DocumentNodeData(targetDocument);
        const tree = new DocumentTree(targetNodeData);

        expect(tree.root.path).toBe('targetBody:targetDoc://');
        expect(tree.root.nodeData.isSource).toBe(false);
      });

      it('should handle parameter document types', () => {
        const paramDocument = {
          documentId: 'global:myParam',
          documentType: DocumentType.PARAM,
          name: 'Parameter Document',
        } as IDocument;

        const paramNodeData = new DocumentNodeData(paramDocument);
        const tree = new DocumentTree(paramNodeData);

        expect(tree.root.path).toBe('param:global:myParam://');
      });
    });

    describe('findNodeByPath', () => {
      it('should find the root node by its path', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        const found = tree.findNodeByPath('sourceBody:testDoc://');

        expect(found).toBe(tree.root);
      });

      it('should return undefined for non-existent path', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        const found = tree.findNodeByPath('sourceBody:nonexistent://');

        expect(found).toBeUndefined();
      });

      it('should find a direct child node', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        const childNodeData = {
          title: 'Child',
          id: 'child-1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-1'),
          isSource: true,
          isPrimitive: false,
        };

        const childNode = tree.root.addChild(childNodeData);

        const found = tree.findNodeByPath('sourceBody:testDoc://child-1');

        expect(found).toBe(childNode);
      });

      it('should find a deeply nested node', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        // Create a multi-level tree
        const level1NodeData = {
          title: 'Level 1',
          id: 'level1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'level1'),
          isSource: true,
          isPrimitive: false,
        };
        const level1 = tree.root.addChild(level1NodeData);

        const level2NodeData = {
          title: 'Level 2',
          id: 'level2',
          path: NodePath.childOf(level1NodeData.path, 'level2'),
          isSource: true,
          isPrimitive: false,
        };
        const level2 = level1.addChild(level2NodeData);

        const level3NodeData = {
          title: 'Level 3',
          id: 'level3',
          path: NodePath.childOf(level2NodeData.path, 'level3'),
          isSource: true,
          isPrimitive: false,
        };
        const level3 = level2.addChild(level3NodeData);

        const found = tree.findNodeByPath('sourceBody:testDoc://level1/level2/level3');

        expect(found).toBe(level3);
      });

      it('should return undefined for partial path match', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        const childNodeData = {
          title: 'Child',
          id: 'child-1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-1'),
          isSource: true,
          isPrimitive: false,
        };
        tree.root.addChild(childNodeData);

        const found = tree.findNodeByPath('sourceBody:testDoc://child-1/nonexistent');

        expect(found).toBeUndefined();
      });

      it('should find nodes among multiple siblings', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        // Add multiple children
        const child1NodeData = {
          title: 'Child 1',
          id: 'child-1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-1'),
          isSource: true,
          isPrimitive: false,
        };
        tree.root.addChild(child1NodeData);

        const child2NodeData = {
          title: 'Child 2',
          id: 'child-2',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-2'),
          isSource: true,
          isPrimitive: false,
        };
        const child2 = tree.root.addChild(child2NodeData);

        const child3NodeData = {
          title: 'Child 3',
          id: 'child-3',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-3'),
          isSource: true,
          isPrimitive: false,
        };
        tree.root.addChild(child3NodeData);

        const found = tree.findNodeByPath('sourceBody:testDoc://child-2');

        expect(found).toBe(child2);
      });

      it('should find nodes in complex tree structure', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        // Create branch 1
        const branch1NodeData = {
          title: 'Branch 1',
          id: 'branch1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'branch1'),
          isSource: true,
          isPrimitive: false,
        };
        const branch1 = tree.root.addChild(branch1NodeData);

        const leaf1NodeData = {
          title: 'Leaf 1',
          id: 'leaf1',
          path: NodePath.childOf(branch1NodeData.path, 'leaf1'),
          isSource: true,
          isPrimitive: false,
        };
        branch1.addChild(leaf1NodeData);

        // Create branch 2
        const branch2NodeData = {
          title: 'Branch 2',
          id: 'branch2',
          path: NodePath.childOf(mockDocumentNodeData.path, 'branch2'),
          isSource: true,
          isPrimitive: false,
        };
        const branch2 = tree.root.addChild(branch2NodeData);

        const leaf2NodeData = {
          title: 'Leaf 2',
          id: 'leaf2',
          path: NodePath.childOf(branch2NodeData.path, 'leaf2'),
          isSource: true,
          isPrimitive: false,
        };
        const leaf2 = branch2.addChild(leaf2NodeData);

        const foundLeaf2 = tree.findNodeByPath('sourceBody:testDoc://branch2/leaf2');
        const foundBranch1 = tree.findNodeByPath('sourceBody:testDoc://branch1');

        expect(foundLeaf2).toBe(leaf2);
        expect(foundBranch1).toBe(branch1);
      });

      it('should handle empty tree correctly', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        const found = tree.findNodeByPath('sourceBody:testDoc://nonexistent');

        expect(found).toBeUndefined();
      });
    });

    describe('integration with DocumentTreeNode', () => {
      it('should maintain tree structure integrity', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        const childNodeData = {
          title: 'Child',
          id: 'child-1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-1'),
          isSource: true,
          isPrimitive: false,
        };
        const childNode = tree.root.addChild(childNodeData);

        expect(tree.root.children).toContain(childNode);
        expect(childNode.parent).toBe(tree.root);
        expect(tree.findNodeByPath(childNode.path)).toBe(childNode);
      });

      it('should correctly mark nodes as parsed when children are added', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        expect(tree.root.isParsed).toBe(false);

        const childNodeData = {
          title: 'Child',
          id: 'child-1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-1'),
          isSource: true,
          isPrimitive: false,
        };
        tree.root.addChild(childNodeData);

        expect(tree.root.isParsed).toBe(true);
      });

      it('should provide access to all root children via getChildren', () => {
        const tree = new DocumentTree(mockDocumentNodeData);

        const child1NodeData = {
          title: 'Child 1',
          id: 'child-1',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-1'),
          isSource: true,
          isPrimitive: false,
        };
        const child1 = tree.root.addChild(child1NodeData);

        const child2NodeData = {
          title: 'Child 2',
          id: 'child-2',
          path: NodePath.childOf(mockDocumentNodeData.path, 'child-2'),
          isSource: true,
          isPrimitive: false,
        };
        const child2 = tree.root.addChild(child2NodeData);

        const children = tree.root.getChildren();

        expect(children).toHaveLength(2);
        expect(children[0]).toBe(child1);
        expect(children[1]).toBe(child2);
      });
    });

    describe('edge cases', () => {
      it('should handle document with empty documentId', () => {
        const emptyIdDocument = {
          documentId: '',
          documentType: DocumentType.SOURCE_BODY,
          name: 'Empty ID Document',
        } as IDocument;

        const nodeData = new DocumentNodeData(emptyIdDocument);
        const tree = new DocumentTree(nodeData);

        expect(tree.root.path).toBe('sourceBody:://');
      });

      it('should handle special characters in documentId', () => {
        const specialDocument = {
          documentId: 'doc-with-special_chars.123',
          documentType: DocumentType.SOURCE_BODY,
          name: 'Special Document',
        } as IDocument;

        const nodeData = new DocumentNodeData(specialDocument);
        const tree = new DocumentTree(nodeData);

        expect(tree.root.path).toBe('sourceBody:doc-with-special_chars.123://');
        expect(tree.findNodeByPath('sourceBody:doc-with-special_chars.123://')).toBe(tree.root);
      });

      it('should handle document with colon in documentId', () => {
        const colonDocument = {
          documentId: 'global:someVariable',
          documentType: DocumentType.PARAM,
          name: 'Colon Document',
        } as IDocument;

        const nodeData = new DocumentNodeData(colonDocument);
        const tree = new DocumentTree(nodeData);

        expect(tree.root.path).toBe('param:global:someVariable://');
        expect(tree.findNodeByPath('param:global:someVariable://')).toBe(tree.root);
      });
    });
  });
});
