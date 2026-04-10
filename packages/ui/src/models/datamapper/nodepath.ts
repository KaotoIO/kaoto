import { DocumentType } from './document';

/**
 * Generic path identifier for a node within a tree structure, using '/' as a segment separator.
 * Each segment is the node's `id`, which ensures uniqueness even when multiple mapping instructions
 * (e.g. `for-each`) share the same name at the same level.
 *
 * `NodePath` is used in two distinct tree structures:
 *
 * - **Mapping tree** ({@link MappingItem.nodePath}): represents the node's position in the XSLT
 *   output structure. `xs:choice` is a schema compositor with no XSLT counterpart, so choice
 *   wrapper segments are absent from these paths.
 *
 * - **Visual document tree** ({@link NodeData.path}): represents the node's position among
 *   rendered document nodes. Unselected choice wrappers ARE rendered nodes and therefore have
 *   their own path segments, even though they won't appear in XPath or the XSLT output.
 */
export class NodePath {
  documentType: DocumentType = DocumentType.SOURCE_BODY;
  documentId: string = '';
  pathSegments: string[] = [];

  constructor(expression?: string) {
    if (!expression) return;
    const parts = expression.split('://');
    if (parts.length < 2) return;
    const index = parts[0].indexOf(':');
    this.documentType = (index === -1 ? parts[0] : parts[0].substring(0, index)) as DocumentType;
    this.documentId = index === -1 ? this.documentId : parts[0].substring(index + 1);
    this.pathSegments = parts[1].length > 0 ? parts[1].split('/') : [];
  }

  toString() {
    const beforePath = `${this.documentType}:${this.documentId}://`;
    return this.pathSegments.length > 0 ? `${beforePath}${this.pathSegments.join('/')}` : beforePath;
  }

  static fromDocument(documentType: DocumentType, documentId: string) {
    return new NodePath(`${documentType}:${documentId}://`);
  }

  static childOf(parent: NodePath, childSegment: string) {
    const answer = new NodePath();
    answer.documentType = parent.documentType;
    answer.documentId = parent.documentId;
    answer.pathSegments = [...parent.pathSegments, childSegment];
    return answer;
  }
}
