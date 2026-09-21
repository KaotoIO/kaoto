import { describe, expect, it } from 'vitest';

import {
  getSectionAnchor,
  PARAMETERS_HEADER_DOCUMENT_NODE_ID,
  PARAMETERS_SECTION_ANCHOR,
  VARIABLES_SECTION_ANCHOR,
} from './connection-port';
import { DocumentType } from './document';
import { NodePath, VARIABLE_PATH_SCHEME, VARIABLES_DOCUMENT_ID } from './nodepath';

describe('connection-port', () => {
  describe('section anchors', () => {
    it('should address the parameters header port', () => {
      expect(PARAMETERS_SECTION_ANCHOR).toEqual({
        documentNodeId: PARAMETERS_HEADER_DOCUMENT_NODE_ID,
        nodePath: 'param:_parameters_header://',
      });
    });

    it('should address the variables header port', () => {
      expect(VARIABLES_SECTION_ANCHOR).toEqual({
        documentNodeId: VARIABLES_DOCUMENT_ID,
        nodePath: 'Var:_variables://',
      });
    });

    it('should produce node paths that parse back to the anchored document', () => {
      const parametersPath = new NodePath(PARAMETERS_SECTION_ANCHOR.nodePath);
      expect(parametersPath.documentType).toBe(DocumentType.PARAM);
      expect(parametersPath.documentId).toBe(PARAMETERS_HEADER_DOCUMENT_NODE_ID);
      expect(parametersPath.pathSegments).toEqual([]);

      const variablesPath = new NodePath(VARIABLES_SECTION_ANCHOR.nodePath);
      expect(variablesPath.documentType).toBe(VARIABLE_PATH_SCHEME);
      expect(variablesPath.documentId).toBe(VARIABLES_DOCUMENT_ID);
      expect(variablesPath.pathSegments).toEqual([]);
    });
  });

  describe('getSectionAnchor', () => {
    it('should anchor parameters to the parameters section', () => {
      expect(getSectionAnchor(DocumentType.PARAM)).toBe(PARAMETERS_SECTION_ANCHOR);
    });

    it.each([DocumentType.SOURCE_BODY, DocumentType.TARGET_BODY])(
      'should leave %s unanchored, having no collapsible section',
      (documentType) => {
        expect(getSectionAnchor(documentType)).toBeUndefined();
      },
    );
  });
});
