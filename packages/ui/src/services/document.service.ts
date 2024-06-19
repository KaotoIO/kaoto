import { IDocument, IField, PrimitiveDocument } from '../models/document';

export class DocumentService {
  static getFieldStack(field: IField, includeItself: boolean = false) {
    if (field instanceof PrimitiveDocument) return [];
    const fieldStack: IField[] = [];
    if (includeItself) fieldStack.push(field);
    for (let next = field.parent; 'parent' in next && next !== next.parent; next = (next as IField).parent) {
      fieldStack.push(next);
    }
    return fieldStack;
  }

  static hasField(document: IDocument, field: IField) {
    if (
      document.documentType !== field.ownerDocument.documentType ||
      document.documentId !== field.ownerDocument.documentId
    )
      return false;
    if (document instanceof PrimitiveDocument && document === field) return true;

    return DocumentService.isDescendant(document, field);
  }

  static isDescendant(parent: IField | IDocument, child: IField): boolean {
    return !!parent.fields.find((f) => f === child || DocumentService.isDescendant(f, child));
  }

  static getFieldFromPathSegments(document: IDocument, pathSegments: string[]) {
    let parent: IDocument | IField = document;
    for (const segment of pathSegments) {
      if (!segment) continue;
      const child: IField | undefined = parent.fields.find((f) => f.expression === segment);
      if (!child) {
        return undefined;
      }
      parent = child;
    }
    return parent;
  }

  static getFieldFromPathExpression(document: IDocument, pathExpression: string) {
    return DocumentService.getFieldFromPathSegments(document, pathExpression.split('/'));
  }
}
