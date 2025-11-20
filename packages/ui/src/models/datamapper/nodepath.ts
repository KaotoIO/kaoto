import { DocumentType } from './document';

/**
 * The internal path representation which uses {@link IField.id} for source and {@link MappingItem.id} for target
 * to represent the node, and use '/' as a path separator.
 * In order to distinguish all the nodes at the target side, we needed to use ID. While document field nodes are all
 * unique with its path (when namespace is taken care) at the same level, e.g. it is guaranteed that `/ns0:ShipOrder/ns0:ShipTo`
 * is unique, it is not the case at the target side once the mappings are overlaid. For example there could be
 * multiple `for-each` element at the same level, for example `/ns0:ShipOrder/for-each` is ambiguous when there're
 * multiple `for-each` at the same level, such as `/ns0:ShipOrder/for-each[0]` and `/ns0:ShipOrder/for-each[1]`.
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
    this.documentType = (index !== -1 ? parts[0].substring(0, index) : parts[0]) as DocumentType;
    this.documentId = index !== -1 ? parts[0].substring(index + 1) : this.documentId;
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
