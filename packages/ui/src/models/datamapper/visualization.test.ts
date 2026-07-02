import { DocumentType } from './document';
import { MappingTree, VariableItem } from './mapping';
import { NodePath } from './nodepath';
import { SourceVariableNodeData, VARIABLES_DOCUMENT_ID } from './visualization';

describe('visualization.ts', () => {
  describe('NodeIdentifier', () => {
    it('should represent a document root', () => {
      const id = new NodePath('sourceBody:docId://');
      expect(id.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(id.documentId).toBe('docId');
      expect(id.pathSegments).toHaveLength(0);
    });

    it('should handle without Document ID', () => {
      const id = new NodePath('sourceBody://a/b/c');
      expect(id.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(id.documentId).toBe('');
      expect(id.pathSegments).toHaveLength(3);
      const id2 = new NodePath('sourceBody:://a/b/c');
      expect(id2.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(id2.documentId).toBe('');
      expect(id2.pathSegments).toHaveLength(3);
    });

    it('should handle a colon in the Document ID', () => {
      const id = new NodePath('param:global:someGlobalVariable://d/e/f');
      expect(id.documentType).toBe(DocumentType.PARAM);
      expect(id.documentId).toBe('global:someGlobalVariable');
      expect(id.pathSegments).toHaveLength(3);
    });

    it('should generate a same string', () => {
      const expression = 'sourceBody:docId://g/h/i';
      const id = new NodePath(expression);
      expect(id.toString()).toEqual(expression);
    });
  });

  describe('SourceVariableNodeData', () => {
    it('should set id, title, and path from variable name', () => {
      const tree = new MappingTree(DocumentType.TARGET_BODY, 'body', 'XML_SCHEMA' as never);
      const variable = new VariableItem(tree, 'tax');
      const nodeData = new SourceVariableNodeData(variable);
      expect(nodeData.id).toBe(`var-${variable.id}`);
      expect(nodeData.title).toBe('$tax');
      expect(nodeData.path.toString()).toBe(`Var:${VARIABLES_DOCUMENT_ID}://${variable.id}`);
      expect(nodeData.isSource).toBe(true);
      expect(nodeData.isPrimitive).toBe(true);
      expect(nodeData.isDocument).toBe(false);
    });
  });
});
