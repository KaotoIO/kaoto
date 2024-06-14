import { DocumentType, NodePath } from './path';

describe('visualization.ts', () => {
  describe('NodeIdentifier', () => {
    it('should represent a document root', () => {
      const id = new NodePath('sourceBody:docId://');
      expect(id.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(id.documentId).toBe('docId');
      expect(id.pathSegments.length).toBe(0);
    });

    it('should handle without Document ID', () => {
      const id = new NodePath('sourceBody://a/b/c');
      expect(id.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(id.documentId).toBe('');
      expect(id.pathSegments.length).toBe(3);
      const id2 = new NodePath('sourceBody:://a/b/c');
      expect(id2.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(id2.documentId).toBe('');
      expect(id2.pathSegments.length).toBe(3);
    });

    it('should handle a colon in the Document ID', () => {
      const id = new NodePath('param:global:someGlobalVariable://d/e/f');
      expect(id.documentType).toBe(DocumentType.PARAM);
      expect(id.documentId).toBe('global:someGlobalVariable');
      expect(id.pathSegments.length).toBe(3);
    });

    it('should generate a same string', () => {
      const expression = 'sourceBody:docId://g/h/i';
      const id = new NodePath(expression);
      expect(id.toString()).toEqual(expression);
    });
  });
});
